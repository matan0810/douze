import { isCountry } from './countries';
import { isId } from './ids';
import { record } from './json';

/**
 * A group's years (SERVER.md, part 3; DESIGN.md, section 4, "Groups"): for each year its
 * stages, the final and up to two semis, each with its countries and the moment it locks;
 * and each member's prediction of each stage, hidden from the others until that moment.
 * One parser per message, used by the site and the Worker alike.
 */

/** The first contest and a far end: the years the site and the server accept. */
export const MIN_YEAR = 1956;
export const MAX_YEAR = 2100;
/** The most countries a stage can have. */
export const MAX_FIELD = 40;
/** How many countries a semi sends to the final, unless its field is smaller. */
export const QUALIFIERS = 10;
/** The most years one group keeps. */
export const MAX_GROUP_YEARS = 30;

/** A lock is a moment in milliseconds, between these two (2000 to 2200). */
const EARLIEST = Date.UTC(2000, 0, 1);
const LATEST = Date.UTC(2200, 0, 1);

export const STAGES = ['final', 'semi-1', 'semi-2'] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: unknown): value is Stage {
  return STAGES.some((stage) => stage === value);
}

export function isYear(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR
  );
}

/** How many qualify from a semi of this many countries: ten, unless the field is smaller. */
export function qualifierCount(countries: readonly string[]): number {
  return Math.max(0, Math.min(QUALIFIERS, countries.length - 1));
}

/** Distinct catalogue countries, at most `max`, or undefined. */
function countryList(value: unknown, max: number): string[] | undefined {
  if (!Array.isArray(value) || value.length > max) return undefined;
  const list = value.filter(isCountry);
  return list.length === value.length && new Set(list).size === list.length ? list : undefined;
}

function isLock(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= EARLIEST && value < LATEST
  );
}

export interface StageSetup {
  countries: string[];
  /** When predictions close and are shown to everyone, in milliseconds. */
  lockAt: number;
  /** The final only: each player names a joker, whose points count double. */
  joker: boolean;
}

export function parseStageSetup(stage: Stage, value: unknown): StageSetup | undefined {
  const json = record(value, ['countries', 'lockAt', 'joker']);
  const countries = countryList(json?.countries, MAX_FIELD);
  if (!json || !countries || countries.length < 2 || !isLock(json.lockAt)) return undefined;
  if (typeof json.joker !== 'boolean' || (json.joker && stage !== 'final')) return undefined;
  return { countries, lockAt: json.lockAt, joker: json.joker };
}

/** The final: an order of its countries, complete or still in progress, and a joker. */
export interface FinalEntry {
  order: string[];
  joker: string | null;
}

/** A semi: the countries expected to qualify, and an eleventh as a reserve. */
export interface SemiEntry {
  picks: string[];
  reserve: string | null;
}

export type Entry = FinalEntry | SemiEntry;

export function isFinalEntry(entry: Entry): entry is FinalEntry {
  return 'order' in entry;
}

/** A member's prediction of a stage, within that stage's countries, or undefined. */
export function parseEntry(
  stage: Stage,
  value: unknown,
  setup: Pick<StageSetup, 'countries' | 'joker'>,
): Entry | undefined {
  const field = new Set(setup.countries);
  const within = (list: string[] | undefined) => list?.every((id) => field.has(id)) && list;
  if (stage === 'final') {
    const json = record(value, ['order', 'joker']);
    const order = within(countryList(json?.order, setup.countries.length));
    const joker = json?.joker ?? null;
    if (
      !json ||
      !order ||
      (joker !== null && !(setup.joker && isCountry(joker) && field.has(joker)))
    )
      return undefined;
    return { order, joker };
  }
  const json = record(value, ['picks', 'reserve']);
  const picks = within(countryList(json?.picks, qualifierCount(setup.countries)));
  const reserve = json?.reserve ?? null;
  if (!json || !picks) return undefined;
  if (reserve !== null && !(isCountry(reserve) && field.has(reserve) && !picks.includes(reserve)))
    return undefined;
  return { picks, reserve };
}

/** Whether a prediction is finished: every country placed, or every qualifier and a reserve. */
export function isCompleteEntry(entry: Entry, countries: readonly string[]): boolean {
  if (isFinalEntry(entry)) return entry.order.length === countries.length;
  return entry.picks.length === qualifierCount(countries) && entry.reserve !== null;
}

export interface StageView extends StageSetup {
  stage: Stage;
  /** Whether the lock has passed, by the server's clock. */
  locked: boolean;
  /** The members whose prediction is finished. */
  done: string[];
  /** This member's prediction, and everyone's once the stage is locked. */
  entries: { member: string; entry: Entry }[];
}

export interface YearView {
  year: number;
  /** The server's clock when it answered, so a countdown does not trust the phone's. */
  now: number;
  stages: StageView[];
}

function parseStageView(value: unknown): StageView | undefined {
  const json = record(value, [
    'stage',
    'countries',
    'lockAt',
    'joker',
    'locked',
    'done',
    'entries',
  ]);
  if (!json || !isStage(json.stage) || typeof json.locked !== 'boolean') return undefined;
  const stage = json.stage;
  const setup = parseStageSetup(stage, {
    countries: json.countries,
    lockAt: json.lockAt,
    joker: json.joker,
  });
  if (!setup || !Array.isArray(json.done) || !Array.isArray(json.entries)) return undefined;
  if (json.done.length > MAX_ENTRIES || json.entries.length > MAX_ENTRIES) return undefined;
  const done = json.done.filter(isId);
  const entries = json.entries.flatMap((raw): StageView['entries'] => {
    const item = record(raw, ['member', 'entry']);
    const entry = parseEntry(stage, item?.entry, setup);
    return item && isId(item.member) && entry ? [{ member: item.member, entry }] : [];
  });
  if (done.length !== json.done.length || entries.length !== json.entries.length) return undefined;
  return { stage, ...setup, locked: json.locked, done, entries };
}

/** As many entries as a group can have members. */
const MAX_ENTRIES = 100;

export function parseYearView(value: unknown): YearView | undefined {
  const json = record(value, ['year', 'now', 'stages']);
  if (!json || !isYear(json.year) || !isLock(json.now) || !Array.isArray(json.stages))
    return undefined;
  if (json.stages.length > STAGES.length) return undefined;
  const stages = json.stages.map(parseStageView);
  if (!stages.every((s): s is StageView => !!s)) return undefined;
  if (new Set(stages.map((s) => s.stage)).size !== stages.length) return undefined;
  return { year: json.year, now: json.now, stages };
}

/** The years a group plays, newest first. */
export function parseYears(value: unknown): number[] | undefined {
  const years = record(value, ['years'])?.years;
  if (!Array.isArray(years) || years.length > MAX_GROUP_YEARS) return undefined;
  const list = years.filter(isYear);
  return list.length === years.length ? list : undefined;
}
