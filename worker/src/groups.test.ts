import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS } from '../../shared/config';
import { parseGroupView, parseJoined, parsePreview } from '../../shared/groups';
import { newToken } from '../../shared/tokens';
import { testDatabase } from '../test/sqlite';
import { handle } from './app';
import type { Env } from './env';

let env: Env & { DB: ReturnType<typeof testDatabase> };
let ip = 0;

beforeEach(() => {
  env = { ALLOWED_ORIGINS: 'http://localhost:5173', DB: testDatabase() };
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

/** A request from its own internet address, unless one is given. */
function call(
  method: string,
  path: string,
  {
    token,
    invite,
    body,
    from,
  }: { token?: string; invite?: string; body?: unknown; from?: string } = {},
) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': from ?? `10.0.0.${++ip % 250}` };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (invite) headers['X-Invite'] = invite;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return handle(
    new Request(`https://api.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

async function create(group = 'החברים', me = 'מתן') {
  const answer = await call('POST', '/groups', { body: { group, me } });
  expect(answer.status).toBe(201);
  const made = parseJoined(await answer.json());
  if (!made?.invite) throw new Error('no group');
  return { ...made, invite: made.invite };
}

async function joinAs(groupId: string, invite: string, name: string, takeover = false) {
  return call('POST', `/groups/${groupId}/join`, { invite, body: { name, takeover } });
}

async function joined(groupId: string, invite: string, name: string) {
  const made = parseJoined(await (await joinAs(groupId, invite, name)).json());
  if (!made) throw new Error('not joined');
  return made;
}

describe('a group', () => {
  it('is made by its owner, who gets a device token and the invite, once', async () => {
    const made = await create();
    expect(made.group.name).toBe('החברים');
    expect(made.group.me).toMatchObject({ name: 'מתן', role: 'owner' });
    expect(made.token).not.toBe(made.invite);
    const stored = env.DB.raw.prepare('SELECT invite_hash FROM groups').get();
    expect(JSON.stringify(stored)).not.toContain(made.invite);
    const devices = env.DB.raw.prepare('SELECT token_hash FROM devices').all();
    expect(JSON.stringify(devices)).not.toContain(made.token);
  });

  it('is read by its members only', async () => {
    const made = await create();
    const ok = await call('GET', `/groups/${made.group.id}`, { token: made.token });
    expect(parseGroupView(await ok.json())?.members.map((m) => m.name)).toEqual(['מתן']);
    expect((await call('GET', `/groups/${made.group.id}`)).status).toBe(401);
    expect((await call('GET', `/groups/${made.group.id}`, { token: newToken() })).status).toBe(401);
    const other = await create('אחרים', 'דנה');
    expect((await call('GET', `/groups/${made.group.id}`, { token: other.token })).status).toBe(
      401,
    );
  });

  it('refuses a name that is empty, too long or not text, and any unknown field', async () => {
    for (const body of [
      { group: '', me: 'מתן' },
      { group: 'x'.repeat(500), me: 'מתן' },
      { group: 5, me: 'מתן' },
      { group: 'a', me: 'b', role: 'owner' },
    ])
      expect((await call('POST', '/groups', { body })).status).toBe(400);
  });
});

describe('the invite', () => {
  it('shows the group before joining, and lets a new name in as a member', async () => {
    const made = await create();
    const preview = parsePreview(
      await (await call('GET', `/groups/${made.group.id}/preview`, { invite: made.invite })).json(),
    );
    expect(preview).toEqual({ name: 'החברים', members: [{ name: 'מתן', role: 'owner' }] });
    const adi = await joined(made.group.id, made.invite, 'עדי');
    expect(adi.group.me).toMatchObject({ name: 'עדי', role: 'member' });
    expect(adi.group.members.map((m) => m.name)).toEqual(['מתן', 'עדי']);
  });

  it('refuses a wrong or missing secret, and counts it against the address', async () => {
    const made = await create();
    const wrong = await call('GET', `/groups/${made.group.id}/preview`, { invite: newToken() });
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toMatchObject({ code: 'invite-wrong' });
    expect((await joinAs(made.group.id, 'nope', 'עדי')).status).toBe(403);
    for (let i = 0; i < LIMITS.joinsPerHour; i++)
      await call('GET', `/groups/${made.group.id}/preview`, {
        invite: newToken(),
        from: '1.2.3.4',
      });
    const blocked = await call('GET', `/groups/${made.group.id}/preview`, {
      invite: newToken(),
      from: '1.2.3.4',
    });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('stops working once the owner renews it, while members stay in', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const renewed = await call('POST', `/groups/${made.group.id}/invite`, { token: made.token });
    const { invite } = (await renewed.json()) as { invite: string };
    expect((await joinAs(made.group.id, made.invite, 'אורי')).status).toBe(403);
    expect((await joinAs(made.group.id, invite, 'אורי')).status).toBe(201);
    expect((await call('GET', `/groups/${made.group.id}`, { token: adi.token })).status).toBe(200);
  });

  it('is renewed by the owner only', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const refused = await call('POST', `/groups/${made.group.id}/invite`, { token: adi.token });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ code: 'forbidden' });
  });
});

describe('names', () => {
  it("asks before taking a player's name over, then moves it to the new phone, in the log", async () => {
    const made = await create();
    await joined(made.group.id, made.invite, 'עדי');
    const asked = await joinAs(made.group.id, made.invite, 'עדי');
    expect(asked.status).toBe(409);
    expect(await asked.json()).toMatchObject({ code: 'name-taken' });
    const taken = await joinAs(made.group.id, made.invite, 'עדי', true);
    expect(taken.status).toBe(201);
    const log = await (
      await call('GET', `/groups/${made.group.id}/audit`, { token: made.token })
    ).json();
    expect(JSON.stringify(log)).toContain('member.takeover');
  });

  it("never lets a manager's name be taken over", async () => {
    const made = await create();
    const refused = await joinAs(made.group.id, made.invite, 'מתן', true);
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ code: 'name-protected' });
  });

  it('keeps at most the limit of devices on one name: the oldest give way', async () => {
    const made = await create();
    const first = await joined(made.group.id, made.invite, 'עדי');
    for (let i = 0; i < LIMITS.devicesPerPlayer; i++)
      await joinAs(made.group.id, made.invite, 'עדי', true);
    const devices = env.DB.raw
      .prepare(
        'SELECT COUNT(*) AS n FROM devices d JOIN members m ON m.id = d.member_id WHERE m.name = ?',
      )
      .get('עדי');
    expect(devices).toEqual({ n: LIMITS.devicesPerPlayer });
    expect((await call('GET', `/groups/${made.group.id}`, { token: first.token })).status).toBe(
      401,
    );
  });

  it('fills up at the limit of members', async () => {
    const made = await create();
    for (let i = 1; i < LIMITS.membersPerGroup; i++)
      expect((await joinAs(made.group.id, made.invite, `שחקן ${i}`)).status).toBe(201);
    const full = await joinAs(made.group.id, made.invite, 'אחד יותר');
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ code: 'group-full' });
  });
});

describe('roles', () => {
  it('are given by the owner only, and the owner stays the owner', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const ori = await joined(made.group.id, made.invite, 'אורי');
    const path = (id: string) => `/groups/${made.group.id}/members/${id}/role`;
    expect(
      (await call('PUT', path(ori.group.me.id), { token: adi.token, body: { role: 'admin' } }))
        .status,
    ).toBe(403);
    const promoted = await call('PUT', path(adi.group.me.id), {
      token: made.token,
      body: { role: 'admin' },
    });
    expect(parseGroupView(await promoted.json())?.members.find((m) => m.name === 'עדי')?.role).toBe(
      'admin',
    );
    // an admin still cannot name admins
    expect(
      (await call('PUT', path(ori.group.me.id), { token: adi.token, body: { role: 'admin' } }))
        .status,
    ).toBe(403);
    const owner = await call('PUT', path(made.group.me.id), {
      token: made.token,
      body: { role: 'member' },
    });
    expect(await owner.json()).toMatchObject({ code: 'owner-stays' });
    expect(
      (await call('PUT', path(adi.group.me.id), { token: made.token, body: { role: 'owner' } }))
        .status,
    ).toBe(400);
  });

  it('let an admin release a player, never the owner; another admin only the owner can', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const ori = await joined(made.group.id, made.invite, 'אורי');
    const dana = await joined(made.group.id, made.invite, 'דנה');
    await call('PUT', `/groups/${made.group.id}/members/${adi.group.me.id}/role`, {
      token: made.token,
      body: { role: 'admin' },
    });
    await call('PUT', `/groups/${made.group.id}/members/${dana.group.me.id}/role`, {
      token: made.token,
      body: { role: 'admin' },
    });
    const free = (who: string, id: string) =>
      call('DELETE', `/groups/${made.group.id}/members/${id}/devices`, { token: who });
    expect((await free(ori.token, adi.group.me.id)).status).toBe(403); // a player
    expect((await free(adi.token, made.group.me.id)).status).toBe(403); // the owner
    expect((await free(adi.token, dana.group.me.id)).status).toBe(403); // another admin
    expect((await free(adi.token, ori.group.me.id)).status).toBe(200);
    expect((await call('GET', `/groups/${made.group.id}`, { token: ori.token })).status).toBe(401);
    expect((await free(made.token, dana.group.me.id)).status).toBe(200);
  });

  it('refuse a member of another group as the target', async () => {
    const made = await create();
    const other = await create('אחרים', 'דנה');
    const answer = await call(
      'DELETE',
      `/groups/${made.group.id}/members/${other.group.me.id}/devices`,
      {
        token: made.token,
      },
    );
    expect(answer.status).toBe(404);
  });
});

describe('leaving and deleting', () => {
  it('lets a player leave, but not the owner', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    expect(
      (await call('DELETE', `/groups/${made.group.id}/members/me`, { token: adi.token })).status,
    ).toBe(204);
    expect((await call('GET', `/groups/${made.group.id}`, { token: adi.token })).status).toBe(401);
    const owner = await call('DELETE', `/groups/${made.group.id}/members/me`, {
      token: made.token,
    });
    expect(await owner.json()).toMatchObject({ code: 'owner-stays' });
  });

  it('deletes the group only for the owner who types its name, and everything goes', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const path = `/groups/${made.group.id}`;
    expect(
      (await call('DELETE', path, { token: adi.token, body: { confirm: 'החברים' } })).status,
    ).toBe(403);
    const wrong = await call('DELETE', path, { token: made.token, body: { confirm: 'משהו' } });
    expect(await wrong.json()).toMatchObject({ code: 'confirm-wrong' });
    expect(
      (await call('DELETE', path, { token: made.token, body: { confirm: 'החברים' } })).status,
    ).toBe(204);
    for (const table of ['groups', 'members', 'devices', 'audit'])
      expect(env.DB.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
  });
});

describe('the audit log', () => {
  it('is read by managers only, and never holds a secret', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    expect((await call('GET', `/groups/${made.group.id}/audit`, { token: adi.token })).status).toBe(
      403,
    );
    const log = JSON.stringify(
      await (await call('GET', `/groups/${made.group.id}/audit`, { token: made.token })).json(),
    );
    expect(log).toContain('group.create');
    expect(log).toContain('member.join');
    expect(log).not.toContain(made.invite);
    expect(log).not.toContain(adi.token);
  });
});

describe('limits on making groups', () => {
  it('allows a few new groups a day from one address', async () => {
    for (let i = 0; i < LIMITS.groupsPerAddressPerDay; i++)
      expect(
        (await call('POST', '/groups', { from: '9.9.9.9', body: { group: `ק${i}`, me: 'א' } }))
          .status,
      ).toBe(201);
    expect(
      (await call('POST', '/groups', { from: '9.9.9.9', body: { group: 'עוד', me: 'א' } })).status,
    ).toBe(429);
  });

  it('stops new groups at the total limit', async () => {
    const insert = env.DB.raw.prepare(
      'INSERT INTO groups (id, name, invite_hash, created_at) VALUES (?, ?, ?, 0)',
    );
    for (let i = 0; i < LIMITS.groupsTotal; i++) insert.run(`g${i}`.padEnd(22, 'x'), `${i}`, 'h');
    const full = await call('POST', '/groups', { body: { group: 'אחרונה', me: 'א' } });
    expect(full.status).toBe(503);
    expect(await full.json()).toMatchObject({ code: 'service-full' });
  });

  it('caps writes from one device a minute', async () => {
    const made = await create();
    let last = 0;
    for (let i = 0; i <= LIMITS.writesPerMinute; i++)
      last = (await call('POST', `/groups/${made.group.id}/invite`, { token: made.token })).status;
    expect(last).toBe(429);
  });
});

describe('addresses', () => {
  it('refuse a malformed id before anything runs, and a wrong method', async () => {
    expect((await call('GET', '/groups/short')).status).toBe(404);
    expect((await call('GET', "/groups/'%20OR%201=1--")).status).toBe(404);
    const made = await create();
    expect((await call('PATCH', `/groups/${made.group.id}`, { token: made.token })).status).toBe(
      405,
    );
  });
});
