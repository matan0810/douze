import { isPiece } from './pieces';
import {
  isCompletePick,
  isCompleteQualifiers,
  MAX_SEMIS,
  qualifierCount,
  type Semi,
} from './semis';
import type { Archive, Bilingual, Country, Edition, Player, Prediction } from './types';

/**
 * Checks the data files. They are ours, but a typo in one should fail the tests and the
 * build with a clear message, not show a broken page, so nothing is cast.
 */

export const ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const CODE_PATTERN = /^[a-z]{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(where: string, what: string): never {
  throw new Error(`${where}: ${what}`);
}

function text(value: unknown, where: string, max = 60): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(where, 'expected a short text');
  return value;
}

function id(value: unknown, where: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) fail(where, 'expected an id');
  return value;
}

function bilingual(value: unknown, where: string): Bilingual {
  if (!isRecord(value)) fail(where, 'expected { he, en }');
  return { he: text(value.he, `${where}.he`), en: text(value.en, `${where}.en`) };
}

function list(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(where, 'expected a list');
  return value;
}

function unique(ids: string[], where: string) {
  const seen = new Set<string>();
  for (const item of ids) {
    if (seen.has(item)) fail(where, `${item} appears twice`);
    seen.add(item);
  }
}

export function parseCountries(value: unknown): Country[] {
  const countries = list(value, 'countries').map((raw, i) => {
    const where = `countries[${i}]`;
    if (!isRecord(raw)) fail(where, 'expected a country');
    if (typeof raw.code !== 'string' || !CODE_PATTERN.test(raw.code))
      fail(`${where}.code`, 'expected a two-letter code');
    return { id: id(raw.id, `${where}.id`), code: raw.code, name: bilingual(raw.name, where) };
  });
  unique(
    countries.map((c) => c.id),
    'countries',
  );
  return countries;
}

export function parsePlayers(value: unknown): Player[] {
  const players = list(value, 'players').map((raw, i) => {
    const where = `players[${i}]`;
    if (!isRecord(raw)) fail(where, 'expected a player');
    if (raw.piece !== undefined && !isPiece(raw.piece)) fail(`${where}.piece`, 'expected a piece');
    const player: Player = { id: id(raw.id, `${where}.id`), name: bilingual(raw.name, where) };
    return isPiece(raw.piece) ? { ...player, piece: raw.piece } : player;
  });
  unique(
    players.map((p) => p.id),
    'players',
  );
  return players;
}

function order(value: unknown, where: string, finalists: Set<string>): string[] {
  const ids = list(value, where).map((raw, i) => id(raw, `${where}[${i}]`));
  unique(ids, where);
  for (const item of ids) if (!finalists.has(item)) fail(where, `${item} is not in the final`);
  if (ids.length !== finalists.size) fail(where, `expected all ${finalists.size} finalists`);
  return ids;
}

/** One semi-final of an edition: its field, who qualified, and each player's ten and eleventh. */
function semi(value: unknown, where: string, known: Set<string>, people: Set<string>): Semi {
  if (!isRecord(value)) fail(where, 'expected a semi-final');
  const field = list(value.countries, `${where}.countries`).map((raw, i) => {
    const item = id(raw, `${where}.countries[${i}]`);
    if (!known.has(item)) fail(`${where}.countries`, `${item} is not in the catalogue`);
    return item;
  });
  unique(field, `${where}.countries`);
  const ids = (raw: unknown, at: string) => list(raw, at).map((x, i) => id(x, `${at}[${i}]`));
  const qualifiers =
    value.qualifiers === null ? null : ids(value.qualifiers, `${where}.qualifiers`);
  if (qualifiers && !isCompleteQualifiers(qualifiers, field))
    fail(`${where}.qualifiers`, `expected ${qualifierCount(field)} distinct countries of the semi`);
  const predictions = list(value.predictions, `${where}.predictions`).map((raw, i) => {
    const at = `${where}.predictions[${i}]`;
    if (!isRecord(raw)) fail(at, 'expected a prediction');
    const player = id(raw.player, `${at}.player`);
    if (!people.has(player)) fail(at, `${player} is not in players.json`);
    const pick = {
      player,
      picks: ids(raw.picks, `${at}.picks`),
      reserve: raw.reserve === null ? null : id(raw.reserve, `${at}.reserve`),
    };
    if (!isCompletePick(pick, { countries: field }))
      fail(at, `expected ${qualifierCount(field)} distinct countries of the semi and a reserve`);
    return pick;
  });
  unique(
    predictions.map((p) => p.player),
    `${where}.predictions`,
  );
  return { countries: field, qualifiers, predictions };
}

export function parseEdition(value: unknown, countries: Country[], players: Player[]): Edition {
  if (!isRecord(value)) fail('edition', 'expected an edition');
  const year = value.year;
  if (typeof year !== 'number' || !Number.isInteger(year) || year < 1956 || year > 2100)
    fail('edition.year', 'expected a year');
  const where = `edition ${year}`;
  if (typeof value.final !== 'string' || !DATE_PATTERN.test(value.final))
    fail(`${where}.final`, 'expected YYYY-MM-DD');
  const known = new Set(countries.map((c) => c.id));
  const finalists = list(value.finalists, `${where}.finalists`).map((raw, i) => {
    const item = id(raw, `${where}.finalists[${i}]`);
    if (!known.has(item)) fail(`${where}.finalists`, `${item} is not in the catalogue`);
    return item;
  });
  unique(finalists, `${where}.finalists`);
  const inFinal = new Set(finalists);
  const result = value.result === null ? null : order(value.result, `${where}.result`, inFinal);
  const people = new Set(players.map((p) => p.id));
  const predictions: Prediction[] = list(value.predictions, `${where}.predictions`).map(
    (raw, i) => {
      const at = `${where}.predictions[${i}]`;
      if (!isRecord(raw)) fail(at, 'expected a prediction');
      const player = id(raw.player, `${at}.player`);
      if (!people.has(player)) fail(at, `${player} is not in players.json`);
      return { player, order: order(raw.order, `${at}.order`, inFinal) };
    },
  );
  unique(
    predictions.map((p) => p.player),
    `${where}.predictions`,
  );
  const semis = (value.semis === undefined ? [] : list(value.semis, `${where}.semis`)).map(
    (raw, i) => semi(raw, `${where}.semis[${i}]`, known, people),
  );
  if (semis.length > MAX_SEMIS) fail(`${where}.semis`, `at most ${MAX_SEMIS}`);
  unique(
    semis.flatMap((s) => s.countries),
    `${where}.semis (a country in two semis)`,
  );
  return {
    year,
    host: bilingual(value.host, `${where}.host`),
    final: value.final,
    finalists,
    result,
    predictions,
    semis,
  };
}

export function parseArchive(raw: {
  countries: unknown;
  players: unknown;
  editions: unknown[];
}): Archive {
  const countries = parseCountries(raw.countries);
  const players = parsePlayers(raw.players);
  const editions = raw.editions
    .map((e) => parseEdition(e, countries, players))
    .sort((a, b) => b.year - a.year);
  unique(
    editions.map((e) => String(e.year)),
    'editions',
  );
  return { countries, players, editions };
}
