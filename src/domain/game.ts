import { isRecord } from './parse';
import { isComplete } from './scoring';
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
}

export interface Game {
  year: number;
  finalists: string[];
  result: string[] | null;
  players: GamePlayer[];
}

/** Limits on what is entered or received: names, players, the field. */
export const MAX_NAME = 30;
export const MAX_PLAYERS = 40;
export const MAX_FINALISTS = 40;
export const MIN_YEAR = 2026;
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
    })),
  };
}

export function emptyGame(year: number): Game {
  return { year, finalists: [], result: null, players: [] };
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
    parsed.push({ id: raw.id, name, order: within(order, field) });
  }
  return {
    year,
    finalists: field,
    result: result && isComplete(result, field) ? result : null,
    players: parsed,
  };
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
  return { ...game, players: game.players.filter((p) => p.id !== id) };
}

export function setOrder(game: Game, id: string, order: string[]): Game {
  return {
    ...game,
    players: game.players.map((p) =>
      p.id === id ? { ...p, order: within(order, game.finalists) } : p,
    ),
  };
}

/**
 * Adds a prediction received from someone: a player of the same name (in either
 * language) gets the new order, anyone else is added.
 */
export function receivePrediction(game: Game, name: string, order: string[]): Game {
  const clean = cleanName(name);
  const same = game.players.find((p) => sameName(p.name, clean));
  return same ? setOrder(game, same.id, order) : addPlayer(game, clean, order);
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
    players: game.players.map((p) => ({ ...p, order: within(p.order, field) })),
  };
}

export function setResult(game: Game, result: string[] | null): Game {
  return { ...game, result: result && isComplete(result, game.finalists) ? [...result] : null };
}

/** Whether the device's game differs from the archive's edition of the same year. */
export function differs(game: Game, baseline: Game): boolean {
  return JSON.stringify(game) !== JSON.stringify(baseline);
}
