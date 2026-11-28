import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMe } from '../../shared/accounts';
import { parseGroupView, parseJoined, parsePreview } from '../../shared/groups';
import { parseSession } from '../../shared/accounts';
import { newToken } from '../../shared/tokens';
import { parseYearView } from '../../shared/years';
import { archive } from '../../src/domain/archive';
import { groupGame } from '../../src/domain/groupYear';
import { standings } from '../../src/domain/scoring';
import { scoringEntries } from '../../src/domain/stats';
import { baselineGame } from '../../src/state/games';
import {
  ARCHIVE_GROUP_ID,
  archiveSeedSql,
  OWNER_EMAIL_PLACEHOLDER,
} from '../../scripts/archiveSeed';
import { account, call, env, joinAs } from '../test/client';
import { codeOf, finish, ok, start, withGoogle } from '../test/google';

const root = new URL('../../', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const generated = () =>
  archiveSeedSql(
    read('src/data/players.json'),
    readdirSync(new URL('src/data/editions/', root))
      .filter((f) => f.endsWith('.json'))
      .map((f) => read(`src/data/editions/${f}`)),
  );

const OWNER_EMAIL = 'matan@example.test';

/** What the deploy does: the owner's email goes into the committed SQL, which is applied. */
function seeded() {
  env.DB.raw.exec(
    readFileSync(new URL('worker/seed/archive.sql', root), 'utf8').replace(
      OWNER_EMAIL_PLACEHOLDER,
      OWNER_EMAIL,
    ),
  );
}

/** The owner signs in with Google, as that email: the seeded owner's name is theirs. */
async function ownerSignsIn() {
  withGoogle();
  const { state, nonce } = await start();
  const back = await finish(state, (n) => ok(n, { email: OWNER_EMAIL }), nonce);
  const session = parseSession(
    await (await call('POST', '/auth/session', { body: { code: codeOf(back) } })).json(),
  );
  if (!session) throw new Error('not signed in');
  return session.token;
}

describe('the archive seeded as a standard group', () => {
  it('is up to date with src/data (run `node scripts/seed-archive.ts` if not)', () => {
    expect(readFileSync(new URL('worker/seed/archive.sql', root), 'utf8')).toBe(generated());
  });

  it("gives the owner's name to the Google account with the owner's email, who invites the rest", async () => {
    seeded();
    const owner = await ownerSignsIn();
    const mine = parseMe(await (await call('GET', '/me', { token: owner })).json());
    expect(mine?.groups.map((g) => [g.id, g.name, g.me.name, g.me.role])).toEqual([
      [ARCHIVE_GROUP_ID, 'החברים', 'מתן', 'owner'],
    ]);
    // Like any owner, they make the invitation link and send it.
    const renewed = await call('POST', `/groups/${ARCHIVE_GROUP_ID}/invite`, { token: owner });
    const { invite } = await renewed.json();
    const preview = parsePreview(
      await (await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite })).json(),
    );
    expect(preview?.members.map((m) => [m.name, m.held]).sort()).toEqual(
      [
        ['אורי', false],
        ['מתן', true],
        ['עדי', false],
      ].sort(),
    );
    // Each of the others joins with their own Google account and picks their name.
    const ori = await joinAs(ARCHIVE_GROUP_ID, invite, 'אורי', true);
    expect(ori.status).toBe(201);
    expect(parseJoined(await ori.json())?.group.me.role).toBe('member');
    const wrong = await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite: newToken() });
    expect(wrong.status).toBe(403);
  });

  it('is not anyone\u2019s until the owner signs in: no one else can get into it', async () => {
    seeded();
    const stranger = await account('Stranger', 'someone@example.test');
    expect(
      (await call('GET', `/groups/${ARCHIVE_GROUP_ID}`, { token: stranger.token })).status,
    ).toBe(401);
  });

  it('holds every archived year closed, with its results, scoring like the archive', async () => {
    seeded();
    const owner = await ownerSignsIn();
    const group = parseGroupView(
      await (await call('GET', `/groups/${ARCHIVE_GROUP_ID}`, { token: owner })).json(),
    );
    if (!group) throw new Error('no group');
    const years = archive.editions.map((e) => e.year);
    const listed = await (
      await call('GET', `/groups/${ARCHIVE_GROUP_ID}/years`, { token: owner })
    ).json();
    expect([...listed.years].sort()).toEqual([...years].sort());
    for (const year of years) {
      const answer = await call('GET', `/groups/${ARCHIVE_GROUP_ID}/years/${year}`, {
        token: owner,
      });
      const view = parseYearView(await answer.json());
      if (!view) throw new Error(`year ${year} does not parse`);
      expect(view.stages.every((s) => s.locked)).toBe(true);
      const game = groupGame(view, group.members);
      const edition = baselineGame(year, archive);
      expect(game.result).toEqual(edition.result);
      const totals = (g: typeof game) =>
        standings(scoringEntries(g), g.result ?? [], g.finalists, g.options.joker)
          .map((s) => s.total)
          .sort((a, b) => a - b);
      expect(totals(game)).toEqual(totals(edition));
    }
  });

  it('can be applied again without changing anything, and keeps the owner and the invitation', async () => {
    seeded();
    const owner = await ownerSignsIn();
    const { invite } = await (
      await call('POST', `/groups/${ARCHIVE_GROUP_ID}/invite`, { token: owner })
    ).json();
    const count = () =>
      JSON.stringify(
        ['groups', 'members', 'stages', 'entries'].map((t) =>
          env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get(),
        ),
      );
    const before = count();
    seeded();
    expect(count()).toBe(before);
    expect((await call('GET', `/groups/${ARCHIVE_GROUP_ID}/preview`, { invite })).status).toBe(200);
    expect((await call('GET', `/groups/${ARCHIVE_GROUP_ID}`, { token: owner })).status).toBe(200);
  });
});
