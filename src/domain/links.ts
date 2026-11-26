import { cleanName, isYear, MAX_FINALISTS, MAX_PLAYERS, type Game } from './game';
import { isComplete } from './scoring';
import type { Country } from './types';

/**
 * Links that carry predictions from one phone to another, with no server: everything is in
 * the address after `#`, which never leaves the browser.
 *
 * A country is one character, its place in the catalogue (`src/data/countries.json`) in
 * base 62; the catalogue therefore only ever grows at its end. A prediction is the
 * characters of its order, then a dash, then the name.
 *
 *   #/predict?y=2026&p=<order>-<name>                      one player's prediction
 *   #/join?y=2026&f=<finalists>&r=<result>&p=...&p=...     a whole group (r optional)
 */

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The longest query a link may carry: far above a real group, far below any limit. */
export const MAX_QUERY = 4000;

export function encodeOrder(order: readonly string[], countries: readonly Country[]): string {
  const index = new Map(countries.map((c, i) => [c.id, i]));
  return order
    .map((id) => {
      const i = index.get(id);
      const digit = i === undefined ? undefined : DIGITS[i];
      if (digit === undefined) throw new Error(`${id} cannot be put in a link`);
      return digit;
    })
    .join('');
}

/** The countries of an encoded order, or undefined if any is unknown or repeated. */
export function decodeOrder(text: string, countries: readonly Country[]): string[] | undefined {
  if (text.length > MAX_FINALISTS) return undefined;
  const ids: string[] = [];
  for (const digit of text) {
    const id = countries[DIGITS.indexOf(digit)]?.id;
    if (!id || ids.includes(id)) return undefined;
    ids.push(id);
  }
  return ids;
}

export interface SharedPrediction {
  name: string;
  order: string[];
}

export interface SharedGroup {
  year: number;
  finalists: string[];
  result: string[] | null;
  players: SharedPrediction[];
}

function predictionParam(name: string, order: readonly string[], countries: readonly Country[]) {
  return `${encodeOrder(order, countries)}-${cleanName(name)}`;
}

function readPrediction(
  value: string,
  countries: readonly Country[],
): SharedPrediction | undefined {
  const dash = value.indexOf('-');
  if (dash < 0) return undefined;
  const order = decodeOrder(value.slice(0, dash), countries);
  const name = cleanName(value.slice(dash + 1));
  return order && name ? { name, order } : undefined;
}

export function predictionHash(
  year: number,
  name: string,
  order: readonly string[],
  countries: readonly Country[],
): string {
  const query = new URLSearchParams({
    y: String(year),
    p: predictionParam(name, order, countries),
  });
  return `#/predict?${query}`;
}

export function groupHash(game: Game, language: 'he' | 'en', countries: readonly Country[]) {
  const query = new URLSearchParams({
    y: String(game.year),
    f: encodeOrder(game.finalists, countries),
  });
  if (game.result) query.set('r', encodeOrder(game.result, countries));
  for (const player of game.players)
    query.append('p', predictionParam(player.name[language], player.order, countries));
  return `#/join?${query}`;
}

function readYear(query: URLSearchParams) {
  const raw = query.get('y') ?? '';
  const year = /^\d{4}$/.test(raw) ? Number(raw) : NaN;
  return isYear(year) ? year : undefined;
}

/** A received prediction: complete orders only, so it can be scored as it is. */
export function readPredictionLink(
  rawQuery: string,
  countries: readonly Country[],
): { year: number; prediction: SharedPrediction } | undefined {
  if (rawQuery.length > MAX_QUERY) return undefined;
  const query = new URLSearchParams(rawQuery);
  const year = readYear(query);
  const prediction = readPrediction(query.get('p') ?? '', countries);
  if (!year || !prediction || prediction.order.length < 2) return undefined;
  return { year, prediction };
}

/**
 * A received group. Each prediction must stay within the finalists (a partial one is kept:
 * its owner may still be working on it); the result must be complete.
 */
export function readGroupLink(
  rawQuery: string,
  countries: readonly Country[],
): SharedGroup | undefined {
  if (rawQuery.length > MAX_QUERY) return undefined;
  const query = new URLSearchParams(rawQuery);
  const year = readYear(query);
  const finalists = decodeOrder(query.get('f') ?? '', countries);
  if (!year || !finalists || finalists.length < 2) return undefined;
  const field = new Set(finalists);
  const rawResult = query.get('r');
  const result = rawResult === null ? null : decodeOrder(rawResult, countries);
  if (result === undefined || (result && !isComplete(result, finalists))) return undefined;
  const raw = query.getAll('p');
  if (raw.length > MAX_PLAYERS) return undefined;
  const players: SharedPrediction[] = [];
  for (const value of raw) {
    const prediction = readPrediction(value, countries);
    if (!prediction || !prediction.order.every((id) => field.has(id))) return undefined;
    if (players.some((p) => p.name === prediction.name)) return undefined;
    players.push(prediction);
  }
  return { year, finalists, result, players };
}
