import { LIMITS } from '../../shared/config';
import {
  isCompleteEntry,
  isStage,
  MAX_GROUP_YEARS,
  parseEntry,
  parseStageSetup,
  qualifierCount,
  STAGES,
  type Entry,
  type Stage,
  type StageSetup,
  type StageView,
  type YearView,
} from '../../shared/years';
import { allow, caller, type Caller } from './auth';
import type { Env } from './env';
import { body, log, writer } from './groups';
import { HttpError, json, readJson } from './http';
import { all, first, int, text, type Row, type Sql } from './sql';

/**
 * A group's years (SERVER.md, part 3): managers set each stage's countries and lock; every
 * member saves their own prediction until the lock. Before it, a member sees only their own
 * prediction and who has finished; after it, everyone's. The lock is the server's clock.
 */

function parseStored<T>(raw: string, parse: (value: unknown) => T | undefined): T {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HttpError(500, 'Bad stored data');
  }
  const parsed = parse(value);
  if (parsed === undefined) throw new HttpError(500, 'Bad stored data');
  return parsed;
}

function stageOf(row: Row): Stage {
  const stage = row.stage;
  if (!isStage(stage)) throw new HttpError(500, 'Bad stored data');
  return stage;
}

function setupOf(row: Row): StageSetup {
  const stage = stageOf(row);
  const countries = parseStored(text(row, 'countries'), (value) => value);
  const setup = parseStageSetup(stage, {
    countries,
    lockAt: int(row, 'lock_at'),
    joker: int(row, 'joker') === 1,
  });
  if (!setup) throw new HttpError(500, 'Bad stored data');
  return setup;
}

async function stages(sql: Sql, groupId: string, year: number) {
  const rows = await all(
    sql
      .prepare(
        'SELECT stage, countries, lock_at, joker FROM stages WHERE group_id = ?1 AND year = ?2',
      )
      .bind(groupId, year),
  );
  return rows
    .map((row) => ({ stage: stageOf(row), setup: setupOf(row) }))
    .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
}

async function yearView(sql: Sql, groupId: string, year: number, me: string): Promise<YearView> {
  const now = Date.now();
  const rows = await all(
    sql
      .prepare(
        'SELECT stage, member_id, body, complete FROM entries WHERE group_id = ?1 AND year = ?2',
      )
      .bind(groupId, year),
  );
  const views = (await stages(sql, groupId, year)).map(({ stage, setup }): StageView => {
    const locked = now >= setup.lockAt;
    const mine = rows.filter((row) => stageOf(row) === stage);
    return {
      stage,
      ...setup,
      locked,
      done: mine.filter((row) => int(row, 'complete') === 1).map((row) => text(row, 'member_id')),
      entries: mine
        .filter((row) => locked || text(row, 'member_id') === me)
        .map((row) => ({
          member: text(row, 'member_id'),
          entry: parseStored(text(row, 'body'), (value) => parseEntry(stage, value, setup)),
        })),
    };
  });
  return { year, now, stages: views };
}

export async function listYears(request: Request, env: Env, groupId: string): Promise<Response> {
  const who = await caller(request, env.DB, groupId);
  allow(who, 'group.read');
  const rows = await all(
    env.DB.prepare('SELECT DISTINCT year FROM stages WHERE group_id = ?1 ORDER BY year DESC').bind(
      groupId,
    ),
  );
  return json({ years: rows.map((row) => int(row, 'year')) });
}

export async function readYear(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
): Promise<Response> {
  const who = await caller(request, env.DB, groupId);
  allow(who, 'group.read');
  return json(await yearView(env.DB, groupId, year, who.member.id));
}

/** A prediction kept within a stage whose countries changed: what still fits stays. */
function refit(entry: Entry, setup: StageSetup): Entry {
  const field = new Set(setup.countries);
  if ('order' in entry) {
    const joker = setup.joker && entry.joker && field.has(entry.joker) ? entry.joker : null;
    return { order: entry.order.filter((id) => field.has(id)), joker };
  }
  const picks = entry.picks.filter((id) => field.has(id)).slice(0, qualifierCount(setup.countries));
  const reserve =
    entry.reserve && field.has(entry.reserve) && !picks.includes(entry.reserve)
      ? entry.reserve
      : null;
  return { picks, reserve };
}

export async function setStage(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
  stage: Stage,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'settings.write');
  const setup = await body(request, (value) => parseStageSetup(stage, value));
  const now = Date.now();
  const before = (await stages(sql, groupId, year)).find((s) => s.stage === stage)?.setup;
  if (!before) {
    const counted = await first(
      sql
        .prepare('SELECT COUNT(DISTINCT year) AS n FROM stages WHERE group_id = ?1 AND year != ?2')
        .bind(groupId, year),
    );
    if (counted && int(counted, 'n') >= MAX_GROUP_YEARS)
      throw new HttpError(409, 'The group has too many years', 'group-full');
  }
  // Once predictions are shown, the countries they were made on stay as they were.
  const moved = before && before.countries.join() !== setup.countries.join();
  if (before && moved && now >= before.lockAt)
    throw new HttpError(409, 'The stage is locked', 'locked');
  const refits = moved
    ? (
        await all(
          sql
            .prepare(
              'SELECT member_id, body FROM entries WHERE group_id = ?1 AND year = ?2 AND stage = ?3',
            )
            .bind(groupId, year, stage),
        )
      ).map((row) => {
        const old = parseStored(text(row, 'body'), (value) => parseEntry(stage, value, before));
        const entry = refit(old, setup);
        return sql
          .prepare(
            `UPDATE entries SET body = ?1, complete = ?2
             WHERE group_id = ?3 AND year = ?4 AND stage = ?5 AND member_id = ?6`,
          )
          .bind(
            JSON.stringify(entry),
            isCompleteEntry(entry, setup.countries) ? 1 : 0,
            groupId,
            year,
            stage,
            text(row, 'member_id'),
          );
      })
    : [];
  await sql.batch([
    sql
      .prepare(
        `INSERT INTO stages (group_id, year, stage, countries, lock_at, joker)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT (group_id, year, stage) DO UPDATE SET
           countries = excluded.countries, lock_at = excluded.lock_at, joker = excluded.joker`,
      )
      .bind(
        groupId,
        year,
        stage,
        JSON.stringify(setup.countries),
        setup.lockAt,
        setup.joker ? 1 : 0,
      ),
    ...refits,
    ...log(sql, groupId, who.member.name, 'stage.set', `${year} ${stage}`),
  ]);
  return json(await yearView(sql, groupId, year, who.member.id));
}

export async function removeStage(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
  stage: Stage,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'settings.write');
  await sql.batch([
    sql
      .prepare('DELETE FROM stages WHERE group_id = ?1 AND year = ?2 AND stage = ?3')
      .bind(groupId, year, stage),
    ...log(sql, groupId, who.member.name, 'stage.remove', `${year} ${stage}`),
  ]);
  return json(await yearView(sql, groupId, year, who.member.id));
}

/**
 * Closes a stage now, by the server's clock: a manager does it when the results start to be
 * read. A stage already closed stays as it was.
 */
export async function closeStage(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
  stage: Stage,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'settings.write');
  const setup = (await stages(sql, groupId, year)).find((s) => s.stage === stage)?.setup;
  if (!setup) throw new HttpError(404, 'No such stage', 'not-found');
  await sql.batch([
    sql
      .prepare(
        'UPDATE stages SET lock_at = MIN(lock_at, ?1) WHERE group_id = ?2 AND year = ?3 AND stage = ?4',
      )
      .bind(Date.now(), groupId, year, stage),
    ...log(sql, groupId, who.member.name, 'stage.close', `${year} ${stage}`),
  ]);
  return json(await yearView(sql, groupId, year, who.member.id));
}

export async function saveEntry(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
  stage: Stage,
): Promise<Response> {
  const sql = env.DB;
  const who: Caller = await writer(request, sql, groupId);
  allow(who, 'entry.write');
  const setup = (await stages(sql, groupId, year)).find((s) => s.stage === stage)?.setup;
  if (!setup) throw new HttpError(404, 'No such stage', 'not-found');
  const raw = await readJson(request, LIMITS.bodyBytes);
  if (Date.now() >= setup.lockAt) throw new HttpError(409, 'The stage is locked', 'locked');
  const entry = parseEntry(stage, raw, setup);
  if (!entry) throw new HttpError(400, 'Bad request', 'bad-request');
  await sql
    .prepare(
      `INSERT INTO entries (group_id, year, stage, member_id, body, complete, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (group_id, year, stage, member_id) DO UPDATE SET
         body = excluded.body, complete = excluded.complete, updated_at = excluded.updated_at`,
    )
    .bind(
      groupId,
      year,
      stage,
      who.member.id,
      JSON.stringify(entry),
      isCompleteEntry(entry, setup.countries) ? 1 : 0,
      Date.now(),
    )
    .run();
  return json(await yearView(sql, groupId, year, who.member.id));
}
