import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_GROUP_YEARS, parseYears, parseYearView, type YearView } from '../../shared/years';
import { call, create, joined } from '../test/client';

const final = ['albania', 'armenia', 'australia', 'austria'];
const semi = ['belgium', 'croatia', 'cyprus', 'czechia', 'denmark'];

afterEach(() => {
  vi.useRealTimers();
});

async function view(answer: Response): Promise<YearView> {
  const parsed = parseYearView(await answer.json());
  if (!parsed) throw new Error('not a year');
  return parsed;
}

/** A group with a manager and a player, and 2027's final and first semi set, an hour away. */
async function season() {
  const owner = await create();
  const player = await joined(owner.group.id, owner.invite, 'עדי');
  const lockAt = Date.now() + 60 * 60 * 1000;
  const base = `/groups/${owner.group.id}/years/2027`;
  const set = await call('PUT', `${base}/final`, {
    token: owner.token,
    body: { countries: final, lockAt, joker: true },
  });
  expect(set.status).toBe(200);
  expect(
    (
      await call('PUT', `${base}/semi-1`, {
        token: owner.token,
        body: { countries: semi, lockAt: lockAt - 1000, joker: false },
      })
    ).status,
  ).toBe(200);
  return { owner, player, lockAt, base };
}

describe("a group's years", () => {
  it('are set by managers only', async () => {
    const { player, base } = await season();
    const tried = await call('PUT', `${base}/semi-2`, {
      token: player.token,
      body: { countries: semi, lockAt: Date.now() + 1000, joker: false },
    });
    expect(tried.status).toBe(403);
    expect((await call('DELETE', `${base}/semi-1`, { token: player.token })).status).toBe(403);
  });

  it('are listed and read by members only', async () => {
    const { owner, player, base } = await season();
    const list = await call('GET', `/groups/${owner.group.id}/years`, { token: player.token });
    expect(parseYears(await list.json())).toEqual([2027]);
    const year = await view(await call('GET', base, { token: player.token }));
    expect(year.stages.map((s) => s.stage)).toEqual(['final', 'semi-1']);
    expect((await call('GET', base)).status).toBe(401);
    const stranger = await create('אחרים', 'דנה');
    expect((await call('GET', base, { token: stranger.token })).status).toBe(401);
  });

  it('refuse a stage that is not one, a year out of range and a bad setup', async () => {
    const { owner } = await season();
    const g = `/groups/${owner.group.id}/years`;
    const body = { countries: final, lockAt: Date.now() + 1000, joker: false };
    expect((await call('PUT', `${g}/2027/semi-3`, { token: owner.token, body })).status).toBe(404);
    expect((await call('PUT', `${g}/1900/final`, { token: owner.token, body })).status).toBe(404);
    const bad = { ...body, countries: ['albania', 'atlantis'] };
    expect((await call('PUT', `${g}/2027/final`, { token: owner.token, body: bad })).status).toBe(
      400,
    );
  });

  it('keep at most the limit of years', async () => {
    const { owner } = await season();
    const body = { countries: final, lockAt: Date.now() + 1000, joker: false };
    for (let year = 1990; year < 1990 + MAX_GROUP_YEARS - 1; year++)
      expect(
        (
          await call('PUT', `/groups/${owner.group.id}/years/${year}/final`, {
            token: owner.token,
            body,
          })
        ).status,
      ).toBe(200);
    const over = await call('PUT', `/groups/${owner.group.id}/years/2099/final`, {
      token: owner.token,
      body,
    });
    expect(over.status).toBe(409);
  });
});

describe('a prediction', () => {
  it('is saved by its member, and hidden from the others until the lock', async () => {
    const { owner, player, base, lockAt } = await season();
    const mine = await call('PUT', `${base}/final/entry`, {
      token: player.token,
      body: { order: final, joker: 'austria' },
    });
    const seen = await view(mine);
    expect(seen.stages[0]?.done).toEqual([player.group.me.id]);
    expect(seen.stages[0]?.entries).toEqual([
      { member: player.group.me.id, entry: { order: final, joker: 'austria' } },
    ]);
    const theirs = await view(await call('GET', base, { token: owner.token }));
    expect(theirs.stages[0]?.done).toEqual([player.group.me.id]);
    expect(theirs.stages[0]?.entries).toEqual([]);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(lockAt);
    const after = await view(await call('GET', base, { token: owner.token }));
    expect(after.stages[0]?.locked).toBe(true);
    expect(after.stages[0]?.entries).toHaveLength(1);
  });

  it('can be partial while in progress, and is not done until complete', async () => {
    const { player, base } = await season();
    const seen = await view(
      await call('PUT', `${base}/semi-1/entry`, {
        token: player.token,
        body: { picks: ['belgium'], reserve: null },
      }),
    );
    expect(seen.stages[1]?.done).toEqual([]);
    expect(seen.stages[1]?.entries[0]?.entry).toEqual({ picks: ['belgium'], reserve: null });
  });

  it('is refused after the lock, outside the field, or for a stage not set', async () => {
    const { player, base, lockAt } = await season();
    const outside = await call('PUT', `${base}/final/entry`, {
      token: player.token,
      body: { order: ['sweden'], joker: null },
    });
    expect(outside.status).toBe(400);
    expect(
      (
        await call('PUT', `${base}/semi-2/entry`, {
          token: player.token,
          body: { picks: [], reserve: null },
        })
      ).status,
    ).toBe(404);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(lockAt);
    const late = await call('PUT', `${base}/final/entry`, {
      token: player.token,
      body: { order: final, joker: null },
    });
    expect(late.status).toBe(409);
    expect(await late.json()).toMatchObject({ code: 'locked' });
  });

  it('keeps what still fits when the countries change before the lock', async () => {
    const { owner, player, base, lockAt } = await season();
    await call('PUT', `${base}/final/entry`, {
      token: player.token,
      body: { order: final, joker: 'albania' },
    });
    const changed = await view(
      await call('PUT', `${base}/final`, {
        token: owner.token,
        body: { countries: ['armenia', 'austria', 'sweden'], lockAt, joker: true },
      }),
    );
    expect(changed.stages[0]?.done).toEqual([]);
    const mine = await view(await call('GET', base, { token: player.token }));
    expect(mine.stages[0]?.entries[0]?.entry).toEqual({
      order: ['armenia', 'austria'],
      joker: null,
    });
  });

  it("keeps a locked stage's countries, though its lock may move", async () => {
    const { owner, base, lockAt } = await season();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(lockAt);
    const moved = await call('PUT', `${base}/final`, {
      token: owner.token,
      body: { countries: final, lockAt: lockAt + 1000, joker: true },
    });
    expect(moved.status).toBe(200);
    vi.setSystemTime(lockAt + 1000);
    const changed = await call('PUT', `${base}/final`, {
      token: owner.token,
      body: { countries: final.slice(1), lockAt, joker: true },
    });
    expect(changed.status).toBe(409);
  });

  it('stays open until a manager closes the stage, which only managers can do', async () => {
    const { owner, player, base } = await season();
    expect((await call('POST', `${base}/final/close`, { token: player.token })).status).toBe(403);
    const closed = await view(await call('POST', `${base}/final/close`, { token: owner.token }));
    expect(closed.stages[0]?.locked).toBe(true);
    const late = await call('PUT', `${base}/final/entry`, {
      token: player.token,
      body: { order: final, joker: null },
    });
    expect(late.status).toBe(409);
    expect((await call('POST', `${base}/semi-2/close`, { token: owner.token })).status).toBe(404);
  });

  it('goes with the stage when a manager removes it', async () => {
    const { owner, player, base } = await season();
    await call('PUT', `${base}/semi-1/entry`, {
      token: player.token,
      body: { picks: ['belgium'], reserve: null },
    });
    const left = await view(await call('DELETE', `${base}/semi-1`, { token: owner.token }));
    expect(left.stages.map((s) => s.stage)).toEqual(['final']);
  });
});
