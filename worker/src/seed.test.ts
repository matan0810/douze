import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newToken, hashToken } from '../../shared/tokens';
import { parseJoined, parsePreview } from '../../shared/groups';
import { parseYearView } from '../../shared/years';
import { archive } from '../../src/domain/archive';
import { groupGame } from '../../src/domain/groupYear';
import { standings } from '../../src/domain/scoring';
import { scoringEntries } from '../../src/domain/stats';
import { baselineGame } from '../../src/state/games';
import {
  ARCHIVE_GROUP_ID,
  archiveSeedSql,
  INVITE_HASH_PLACEHOLDER,
} from '../../scripts/archiveSeed';
import { call, env, joinAs } from '../test/client';

const root = new URL('../../', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const generated = () =>
  archiveSeedSql(
    read('src/data/players.json'),
    readdirSync(new URL('src/data/editions/', root))
      .filter((f) => f.endsWith('.json'))
      .map((f) => read(`src/data/editions/${f}`)),
  );

/** What the deploy does: the invitation's secret becomes its hash in the committed SQL. */
async function seeded() {
  const invite = newToken();
  const sql = readFileSync(new URL('worker/seed/archive.sql', root), 'utf8').replace(
    INVITE_HASH_PLACEHOLDER,
    await hashToken(invite),
  );
  env.DB.raw.exec(sql);
  return invite;
}

describe('the archive seeded as a standard group', () => {
  it('is up to date with src/data (run `node scripts/seed-archive.ts` if not)', () => {
    expect(readFileSync(new URL('worker/seed/archive.sql', root), 'utf8')).toBe(generated());
  });

  it('is joined with the invitation like any group, each person taking their own name', async () => {
    const invite = await seeded();
    const preview = parsePreview(
      await (await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite })).json(),
    );
    expect(preview?.members.map((m) => [m.name, m.role, m.held]).sort()).toEqual(
      [
        ['אורי', 'member', false],
        ['מתן', 'owner', false],
        ['עדי', 'member', false],
      ].sort(),
    );
    const owner = await joinAs(ARCHIVE_GROUP_ID, invite, 'מתן', true);
    expect(owner.status).toBe(201);
    expect(parseJoined(await owner.json())?.group.me.role).toBe('owner');
    const wrong = await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite: newToken() });
    expect(wrong.status).toBe(403);
  });

  it('holds every archived year closed, with its results, scoring like the archive', async () => {
    const invite = await seeded();
    const joined = parseJoined(await (await joinAs(ARCHIVE_GROUP_ID, invite, 'מתן', true)).json());
    if (!joined) throw new Error('not joined');
    const years = archive.editions.map((e) => e.year);
    const listed = await (
      await call('GET', `/groups/${ARCHIVE_GROUP_ID}/years`, { token: joined.token })
    ).json();
    expect([...listed.years].sort()).toEqual([...years].sort());
    for (const year of years) {
      const answer = await call('GET', `/groups/${ARCHIVE_GROUP_ID}/years/${year}`, {
        token: joined.token,
      });
      const view = parseYearView(await answer.json());
      if (!view) throw new Error(`year ${year} does not parse`);
      expect(view.stages.every((s) => s.locked)).toBe(true);
      const game = groupGame(view, joined.group.members);
      const edition = baselineGame(year, archive);
      expect(game.result).toEqual(edition.result);
      const totals = (g: typeof game) =>
        standings(scoringEntries(g), g.result ?? [], g.finalists, g.options.joker)
          .map((s) => s.total)
          .sort((a, b) => a - b);
      expect(totals(game)).toEqual(totals(edition));
    }
  });

  it('can be applied again without changing anything', async () => {
    const invite = await seeded();
    const count = () =>
      JSON.stringify(
        ['groups', 'members', 'stages', 'entries'].map((t) =>
          env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get(),
        ),
      );
    const before = count();
    env.DB.raw.exec(
      readFileSync(new URL('worker/seed/archive.sql', root), 'utf8').replace(
        INVITE_HASH_PLACEHOLDER,
        await hashToken(newToken()),
      ),
    );
    expect(count()).toBe(before);
    // The invitation stays the first one: a second application does not replace it.
    const ok = await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite });
    expect(ok.status).toBe(200);
  });
});
