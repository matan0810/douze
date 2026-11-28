import { LIMITS } from './config';
import { parseName } from './groups';
import { record } from './json';
import {
  isStage,
  parseEntry,
  parseResult,
  parseStageSetup,
  STAGES,
  type Entry,
  type Stage,
  type StageSetup,
} from './years';

/**
 * One year of the archive, sent to a group once by its owner (issue #6, step 2): each stage
 * with its countries, the moment it closed, its official result and every player's
 * prediction, by name. The server turns names into members (a name nobody holds yet becomes
 * a member with no phone, whom its person claims by joining with that name) and the stages
 * into closed stages. One parser, used by the site and the Worker.
 */
export interface ImportStage extends StageSetup {
  stage: Stage;
  result: string[] | null;
  entries: { name: string; entry: Entry }[];
}

export interface ImportYear {
  stages: ImportStage[];
}

function parseImportStage(value: unknown): ImportStage | undefined {
  const json = record(value, ['stage', 'countries', 'lockAt', 'joker', 'result', 'entries']);
  if (!json || !isStage(json.stage) || !Array.isArray(json.entries)) return undefined;
  const stage = json.stage;
  const setup = parseStageSetup(stage, {
    countries: json.countries,
    lockAt: json.lockAt,
    joker: json.joker,
  });
  if (!setup || json.entries.length > LIMITS.membersPerGroup) return undefined;
  const result = json.result === null ? null : parseResult(stage, json.result, setup.countries);
  if (result === undefined) return undefined;
  const entries = json.entries.map((raw) => {
    const item = record(raw, ['name', 'entry']);
    const name = parseName(item?.name);
    const entry = parseEntry(stage, item?.entry, setup);
    return name && entry ? { name, entry } : undefined;
  });
  if (!entries.every((e): e is ImportStage['entries'][number] => !!e)) return undefined;
  // Two entries of one person are one too many: names are the same person's when they match.
  const people = new Set(entries.map((e) => e.name.toLocaleLowerCase()));
  if (people.size !== entries.length) return undefined;
  return { stage, ...setup, result, entries };
}

export function parseImportYear(value: unknown): ImportYear | undefined {
  const json = record(value, ['stages']);
  if (!json || !Array.isArray(json.stages) || json.stages.length > STAGES.length) return undefined;
  const stages = json.stages.map(parseImportStage);
  if (!stages.every((s): s is ImportStage => !!s)) return undefined;
  if (new Set(stages.map((s) => s.stage)).size !== stages.length) return undefined;
  return { stages };
}
