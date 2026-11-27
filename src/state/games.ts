import { archive } from '../domain/archive';
import {
  addPlayer,
  differs,
  emptyGame,
  gameFromEdition,
  isYear,
  parseStoredGame,
  sameName,
  setFinalists,
  setResult,
  type Game,
} from '../domain/game';
import { isRecord } from '../domain/parse';
import type { Archive } from '../domain/types';

/** Where each final edited on this device is saved: one key per year. */
export const GAME_PREFIX = 'eurorank:game:';
/** What the first site saved, read once and moved to the new keys. */
const LEGACY_PREFIX = 'eurorank_state_he_';

/** The few calls of `localStorage` this needs, so tests can hand in a plain map. */
export interface Store {
  keys(): string[];
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function baselineGame(year: number, data: Archive = archive): Game {
  const edition = data.editions.find((e) => e.year === year);
  return edition ? gameFromEdition(edition, data.players) : emptyGame(year);
}

function parseJson(raw: string | null): unknown {
  try {
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** The first site's saved state for a year, as a game. Its players keep their names. */
export function fromLegacy(
  value: unknown,
  year: number,
  data: Archive = archive,
): Game | undefined {
  if (!isRecord(value) || !Array.isArray(value.countries) || !Array.isArray(value.players))
    return undefined;
  const known = new Set(data.countries.map((c) => c.id));
  const finalists = value.countries
    .map((c) => (isRecord(c) && typeof c.id === 'string' ? c.id : ''))
    .filter((id) => known.has(id));
  // The first site had no semis, settings or dates: the archive's stand.
  const baseline = baselineGame(year, data);
  let game: Game = setFinalists({ ...baseline, finalists: [], result: null, players: [] }, [
    ...new Set(finalists),
  ]);
  for (const raw of value.players) {
    if (!isRecord(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.prediction)) continue;
    const order = raw.prediction.filter((id): id is string => typeof id === 'string');
    const name = raw.name;
    const known = data.players.find((p) => sameName(p.name, name));
    game = addPlayer(game, name, order, known?.id);
    if (known) {
      const last = game.players.at(-1);
      if (last) last.name = known.name;
    }
  }
  const results = isRecord(value.results) ? value.results.finalOrder : null;
  const order = Array.isArray(results)
    ? results.filter((id): id is string => typeof id === 'string')
    : null;
  return setResult(game, order);
}

/**
 * Every final this device knows: the archive's, and those saved here (edited or created). Saved games that match their archive edition are dropped, so the device
 * follows later corrections of the archive.
 */
export function loadGames(store: Store, data: Archive = archive): Map<number, Game> {
  const known = new Set(data.countries.map((c) => c.id));
  const games = new Map<number, Game>(
    data.editions.map((e) => [e.year, gameFromEdition(e, data.players)]),
  );
  for (const key of store.keys()) {
    const legacy = key.startsWith(LEGACY_PREFIX);
    if (!legacy && !key.startsWith(GAME_PREFIX)) continue;
    const year = Number(key.slice(legacy ? LEGACY_PREFIX.length : GAME_PREFIX.length));
    if (!isYear(year)) continue;
    const value = parseJson(store.get(key));
    if (legacy) {
      store.remove(key);
      if (store.get(GAME_PREFIX + year) !== null) continue;
    }
    const game = legacy ? fromLegacy(value, year, data) : parseStoredGame(value, year, known);
    if (!game) {
      store.remove(key);
      continue;
    }
    if (!differs(game, baselineGame(year, data))) {
      store.remove(GAME_PREFIX + year);
      continue;
    }
    games.set(year, game);
    if (legacy) store.set(GAME_PREFIX + year, JSON.stringify(game));
  }
  return games;
}

/** Saves a game, or forgets it when it is the archive's edition again. */
export function saveGame(store: Store, game: Game, data: Archive = archive) {
  const key = GAME_PREFIX + game.year;
  if (differs(game, baselineGame(game.year, data))) store.set(key, JSON.stringify(game));
  else store.remove(key);
}

/** `localStorage`, where failures (private mode, a full disk) only mean nothing is kept. */
export const browserStore: Store = {
  keys: () => {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Best-effort: the game still changes for this visit.
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to do.
    }
  },
};
