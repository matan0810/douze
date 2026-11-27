import { DATE_PATTERN, isRecord } from './parse';
import { isComplete } from './scoring';
import { isCompleteQualifiers, MAX_SEMIS, qualifierCount, type Semi, type SemiPick } from './semis';
import type { Bilingual, Edition, Player } from './types';

/**
 * A final as this device sees it: the archive's edition (or nothing, for a year the
 * archive does not have yet) plus whatever was entered here. Predictions may be partial
 * while someone is still working on theirs; the result is complete or absent.
 */
export interface GamePlayer {
  id: string;
  name: Bilingual;
  order: string[];
  /** Their joker, a finalist whose points count double when the year has jokers. */
  joker?: string;
}

/** What a year's settings switch on (DESIGN.md, section 4). */
export interface GameOptions {
  /** The semis and the final add up to a season table. */
  season: boolean;
  /** Every player has a joker in the final. */
  joker: boolean;
}

export const DEFAULT_OPTIONS: GameOptions = { season: true, joker: false };

export interface Game {
  year: number;
  finalists: string[];
  result: string[] | null;
  players: GamePlayer[];
  /** The year's semi-finals, each its own field, result and predictions (`semis.ts`). */
  semis: Semi[];
  /** The date of the final, YYYY-MM-DD, or null when not known. */
  date: string | null;
  /** The host country, a catalogue id, or null when not known. */
  hostCountry: string | null;
  /** The order the final's songs are performed in; may be partial or empty. */
  runningOrder: string[];
  options: GameOptions;
}

/** Limits on what is entered or received: names, players, the field. */
export const MAX_NAME = 30;
export const MAX_PLAYERS = 40;
export const MAX_FINALISTS = 40;
/** The first contest (1956), the same lower bound the data checks use in `parse.ts`. */
export const MIN_YEAR = 1956;
export const MAX_YEAR = 2100;

export function isYear(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR
  );
}

/** A name as typed: trimmed, inner spaces collapsed, no control or direction marks, capped. */
export function cleanName(raw: string): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NAME)
  );
}

/** A name typed on a device is the same in both languages. */
export function typedName(name: string): Bilingual {
  return { he: name, en: name };
}

export function gameFromEdition(edition: Edition, players: Player[]): Game {
  const byId = new Map(players.map((p) => [p.id, p]));
  return {
    year: edition.year,
    finalists: [...edition.finalists],
    result: edition.result ? [...edition.result] : null,
    players: edition.predictions.map((p) => ({
      id: p.player,
      name: byId.get(p.player)?.name ?? typedName(p.player),
      order: [...p.order],
      ...(p.joker ? { joker: p.joker } : {}),
    })),
    semis: edition.semis.map((semi) => ({
      countries: [...semi.countries],
      qualifiers: semi.qualifiers ? [...semi.qualifiers] : null,
      predictions: semi.predictions.map((p) => ({ ...p, picks: [...p.picks] })),
    })),
    date: edition.final,
    hostCountry: edition.hostCountry,
    runningOrder: [...edition.runningOrder],
    options: { season: edition.season, joker: edition.joker },
  };
}

export function emptyGame(year: number): Game {
  return {
    year,
    finalists: [],
    result: null,
    players: [],
    semis: [],
    date: null,
    hostCountry: null,
    runningOrder: [],
    options: { ...DEFAULT_OPTIONS },
  };
}

/** Keeps the countries of `order` that are finalists, each once, in its order. */
function within(order: readonly string[], finalists: readonly string[]): string[] {
  const allowed = new Set(finalists);
  const seen = new Set<string>();
  return order.filter((id) => {
    if (!allowed.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function stringList(value: unknown, max: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > max) return undefined;
  return value.every((v): v is string => typeof v === 'string') ? value : undefined;
}

/**
 * Reads a game saved on this device. Anything there may come from an older release or be
 * edited by hand, so it is checked: unknown countries and repeats are dropped, a result
 * that is no longer complete is dropped, a bad entry means no saved game.
 */
export function parseStoredGame(
  value: unknown,
  year: number,
  known: Set<string>,
): Game | undefined {
  if (!isRecord(value) || value.year !== year) return undefined;
  const finalists = stringList(value.finalists, MAX_FINALISTS);
  const players = Array.isArray(value.players) ? value.players.slice(0, MAX_PLAYERS) : undefined;
  if (!finalists || !players) return undefined;
  const field = within(finalists, [...known]);
  const result = value.result === null ? null : stringList(value.result, MAX_FINALISTS);
  if (result === undefined) return undefined;
  const ids = new Set<string>();
  const parsed: GamePlayer[] = [];
  for (const raw of players) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id || raw.id.length > 60) continue;
    if (ids.has(raw.id)) continue;
    const name = isRecord(raw.name)
      ? { he: cleanName(String(raw.name.he ?? '')), en: cleanName(String(raw.name.en ?? '')) }
      : undefined;
    const order = stringList(raw.order, MAX_FINALISTS);
    if (!name?.he || !name.en || !order) continue;
    ids.add(raw.id);
    const joker = typeof raw.joker === 'string' && field.includes(raw.joker) ? raw.joker : null;
    parsed.push({ id: raw.id, name, order: within(order, field), ...(joker ? { joker } : {}) });
  }
  const options = isRecord(value.options) ? value.options : {};
  return {
    year,
    finalists: field,
    result: result && isComplete(result, field) ? result : null,
    players: parsed,
    semis: parseStoredSemis(value.semis, known, ids),
    date: typeof value.date === 'string' && DATE_PATTERN.test(value.date) ? value.date : null,
    hostCountry:
      typeof value.hostCountry === 'string' && known.has(value.hostCountry)
        ? value.hostCountry
        : null,
    runningOrder: within(stringList(value.runningOrder, MAX_FINALISTS) ?? [], field),
    options: {
      season: typeof options.season === 'boolean' ? options.season : DEFAULT_OPTIONS.season,
      joker: typeof options.joker === 'boolean' ? options.joker : DEFAULT_OPTIONS.joker,
    },
  };
}

/** The semis of a saved game, read as leniently as the rest: what does not fit is dropped. */
function parseStoredSemis(value: unknown, known: Set<string>, players: Set<string>): Semi[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.slice(0, MAX_SEMIS).flatMap((raw): Semi[] => {
    if (!isRecord(raw)) return [];
    const field = within(stringList(raw.countries, MAX_FINALISTS) ?? [], [...known]).filter(
      (id) => !used.has(id),
    );
    field.forEach((id) => used.add(id));
    const qualifiers = stringList(raw.qualifiers, MAX_FINALISTS);
    const picks: SemiPick[] = (Array.isArray(raw.predictions) ? raw.predictions : []).flatMap(
      (p): SemiPick[] => {
        if (!isRecord(p) || typeof p.player !== 'string' || !players.has(p.player)) return [];
        const reserve =
          typeof p.reserve === 'string' && field.includes(p.reserve) ? p.reserve : null;
        const chosen = within(stringList(p.picks, MAX_FINALISTS) ?? [], field).filter(
          (id) => id !== reserve,
        );
        return [{ player: p.player, picks: chosen.slice(0, qualifierCount(field)), reserve }];
      },
    );
    return [
      {
        countries: field,
        qualifiers: qualifiers && isCompleteQualifiers(qualifiers, field) ? qualifiers : null,
        predictions: picks.filter((p, i) => picks.findIndex((o) => o.player === p.player) === i),
      },
    ];
  });
}

/** A new id for a player added on this device, unlike any in the game. */
export function newPlayerId(game: Game, seed: number = Date.now()): string {
  let id = `p${seed.toString(36)}`;
  for (let n = 1; game.players.some((p) => p.id === id); n++) id = `p${seed.toString(36)}-${n}`;
  return id;
}

export function addPlayer(game: Game, name: string, order: string[] = [], id?: string): Game {
  const clean = cleanName(name);
  if (!clean || game.players.length >= MAX_PLAYERS) return game;
  const player = {
    id: id ?? newPlayerId(game),
    name: typedName(clean),
    order: within(order, game.finalists),
  };
  return { ...game, players: [...game.players, player] };
}

export function removePlayer(game: Game, id: string): Game {
  return {
    ...game,
    players: game.players.filter((p) => p.id !== id),
    semis: game.semis.map((semi) => ({
      ...semi,
      predictions: semi.predictions.filter((p) => p.player !== id),
    })),
  };
}

export function setOrder(game: Game, id: string, order: string[]): Game {
  return {
    ...game,
    players: game.players.map((p) =>
      p.id === id ? { ...p, order: within(order, game.finalists) } : p,
    ),
  };
}

export function sameName(name: Bilingual, other: string): boolean {
  const key = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  return key(name.he) === key(other) || key(name.en) === key(other);
}

/** Changes the field; predictions and the result keep only the countries still in it. */
export function setFinalists(game: Game, finalists: string[]): Game {
  const field = [...new Set(finalists)].slice(0, MAX_FINALISTS);
  return {
    ...game,
    finalists: field,
    result: game.result && isComplete(game.result, field) ? game.result : null,
    players: game.players.map((p) => withJoker({ ...p, order: within(p.order, field) }, field)),
    runningOrder: within(game.runningOrder, field),
  };
}

/** Keeps a player's joker only while it is in the field. */
function withJoker(player: GamePlayer, field: readonly string[]): GamePlayer {
  if (!player.joker || field.includes(player.joker)) return player;
  return withoutJoker(player);
}

function withoutJoker({ id, name, order }: GamePlayer): GamePlayer {
  return { id, name, order };
}

/** Sets a player's joker: a finalist, or none. */
export function setJoker(game: Game, id: string, joker: string | null): Game {
  return {
    ...game,
    players: game.players.map((p) => {
      if (p.id !== id) return p;
      const rest = withoutJoker(p);
      return joker && game.finalists.includes(joker) ? { ...rest, joker } : rest;
    }),
  };
}

export function setOptions(game: Game, options: Partial<GameOptions>): Game {
  return { ...game, options: { ...game.options, ...options } };
}

/** Sets the date of the final: YYYY-MM-DD, or none. */
export function setDate(game: Game, date: string | null): Game {
  return { ...game, date: date && DATE_PATTERN.test(date) ? date : null };
}

/** Sets the host country: one of the catalogue, or none. */
export function setHostCountry(game: Game, country: string | null, known: Set<string>): Game {
  return { ...game, hostCountry: country && known.has(country) ? country : null };
}

export function setRunningOrder(game: Game, order: string[]): Game {
  return { ...game, runningOrder: within(order, game.finalists) };
}

export function setResult(game: Game, result: string[] | null): Game {
  return { ...game, result: result && isComplete(result, game.finalists) ? [...result] : null };
}

/** Whether the device's game differs from the archive's edition of the same year. */
export function differs(game: Game, baseline: Game): boolean {
  return JSON.stringify(game) !== JSON.stringify(baseline);
}

/** Sets how many semis the year has (none, one or two); removing one drops what it held. */
export function setSemiCount(game: Game, count: number): Game {
  const n = Math.max(0, Math.min(MAX_SEMIS, Math.round(count)));
  const semis = game.semis.slice(0, n);
  while (semis.length < n) semis.push({ countries: [], qualifiers: null, predictions: [] });
  return { ...game, semis };
}

function updateSemi(game: Game, index: number, change: (semi: Semi) => Semi): Game {
  if (!game.semis[index]) return game;
  return { ...game, semis: game.semis.map((semi, i) => (i === index ? change(semi) : semi)) };
}

/**
 * Sets a semi's field. A country can be in one semi only, so it leaves the other; picks and
 * the result keep only what is still in the field, and a result no longer complete goes.
 */
export function setSemiCountries(game: Game, index: number, countries: string[]): Game {
  const field = [...new Set(countries)].slice(0, MAX_FINALISTS);
  const taken = new Set(field);
  const others = game.semis.map((semi, i) =>
    i === index
      ? semi
      : narrowSemi(
          semi,
          semi.countries.filter((id) => !taken.has(id)),
        ),
  );
  return updateSemi({ ...game, semis: others }, index, (semi) => narrowSemi(semi, field));
}

function narrowSemi(semi: Semi, field: string[]): Semi {
  return {
    countries: field,
    qualifiers:
      semi.qualifiers && isCompleteQualifiers(semi.qualifiers, field) ? semi.qualifiers : null,
    predictions: semi.predictions.map((p) => ({
      ...p,
      picks: within(p.picks, field),
      reserve: p.reserve && field.includes(p.reserve) ? p.reserve : null,
    })),
  };
}

/** Sets who qualified from a semi: a complete set, or nothing. */
export function setSemiQualifiers(game: Game, index: number, qualifiers: string[] | null): Game {
  return updateSemi(game, index, (semi) => ({
    ...semi,
    qualifiers:
      qualifiers && isCompleteQualifiers(qualifiers, semi.countries) ? [...qualifiers] : null,
  }));
}

/** Sets a player's pick in a semi: their qualifiers (within the field, at most the count). */
export function setSemiPick(
  game: Game,
  index: number,
  player: string,
  picks: string[],
  reserve: string | null,
): Game {
  return updateSemi(game, index, (semi) => {
    const field = semi.countries;
    const keep = reserve && field.includes(reserve) ? reserve : null;
    const chosen = within(picks, field)
      .filter((id) => id !== keep)
      .slice(0, qualifierCount(field));
    const pick = { player, picks: chosen, reserve: keep };
    const others = semi.predictions.filter((p) => p.player !== player);
    return { ...semi, predictions: [...others, pick] };
  });
}
