import { LIMITS } from '../../shared/config';
import { newId } from '../../shared/ids';
import { parseImportYear } from '../../shared/importYear';
import { isCompleteEntry } from '../../shared/years';
import { allow } from './auth';
import type { Env } from './env';
import { body, log, writer } from './groups';
import { HttpError, json } from './http';
import { all, int, text, type Statement } from './sql';
import { readYearView } from './years';

/**
 * Puts one year of the archive in a group, once, by its owner (issue #6, step 2). The stages
 * come in already closed, with their results and every player's prediction, by name; a name
 * nobody holds becomes a member with no phone, whom its person claims by joining with it.
 * It replaces the year's stages and everything predicted in them.
 */
export async function importYear(
  request: Request,
  env: Env,
  groupId: string,
  year: number,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'group.import');
  const imported = await body(request, parseImportYear);

  const members = new Map(
    (await all(sql.prepare('SELECT id, name FROM members WHERE group_id = ?1').bind(groupId))).map(
      (row) => [text(row, 'name').toLocaleLowerCase(), text(row, 'id')] as const,
    ),
  );
  const names = new Map(
    imported.stages.flatMap((s) =>
      s.entries.map((e) => [e.name.toLocaleLowerCase(), e.name] as const),
    ),
  );
  const fresh = [...names].filter(([key]) => !members.has(key));
  const counted = (
    await all(sql.prepare('SELECT COUNT(*) AS n FROM members WHERE group_id = ?1').bind(groupId))
  )[0];
  if ((counted ? int(counted, 'n') : 0) + fresh.length > LIMITS.membersPerGroup)
    throw new HttpError(409, 'The group is full', 'group-full');

  const now = Date.now();
  const statements: Statement[] = [];
  for (const [key, name] of fresh) {
    const id = newId();
    members.set(key, id);
    statements.push(
      sql
        .prepare(
          "INSERT INTO members (id, group_id, name, role, joined_at) VALUES (?1, ?2, ?3, 'member', ?4)",
        )
        .bind(id, groupId, name, now),
    );
  }
  for (const stage of imported.stages) {
    statements.push(
      sql
        .prepare(
          `INSERT INTO stages (group_id, year, stage, countries, lock_at, joker, result)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT (group_id, year, stage) DO UPDATE SET
             countries = excluded.countries, lock_at = excluded.lock_at,
             joker = excluded.joker, result = excluded.result`,
        )
        .bind(
          groupId,
          year,
          stage.stage,
          JSON.stringify(stage.countries),
          stage.lockAt,
          stage.joker ? 1 : 0,
          stage.result ? JSON.stringify(stage.result) : null,
        ),
      sql
        .prepare('DELETE FROM entries WHERE group_id = ?1 AND year = ?2 AND stage = ?3')
        .bind(groupId, year, stage.stage),
    );
    for (const { name, entry } of stage.entries) {
      const member = members.get(name.toLocaleLowerCase());
      if (!member) continue;
      statements.push(
        sql
          .prepare(
            `INSERT INTO entries (group_id, year, stage, member_id, body, complete, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          )
          .bind(
            groupId,
            year,
            stage.stage,
            member,
            JSON.stringify(entry),
            isCompleteEntry(entry, stage.countries) ? 1 : 0,
            now,
          ),
      );
    }
  }
  statements.push(...log(sql, groupId, who.member.name, 'archive.import', String(year)));
  await sql.batch(statements);
  return json(await readYearView(sql, groupId, year, who.member.id));
}
