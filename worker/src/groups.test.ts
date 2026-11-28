import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../shared/config';
import { parseGroupView, parseJoined, parsePreview } from '../../shared/groups';
import { newToken } from '../../shared/tokens';
import { account, call, create, env, joinAs, joined } from '../test/client';

describe('a group', () => {
  it('is made by its owner, who gets the invite, once', async () => {
    const made = await create();
    expect(made.group.name).toBe('החברים');
    expect(made.group.me).toMatchObject({ name: 'מתן', role: 'owner' });
    expect(made.token).not.toBe(made.invite);
    const stored = env.DB.raw.prepare('SELECT invite_hash FROM groups').get();
    expect(JSON.stringify(stored)).not.toContain(made.invite);
    const sessions = env.DB.raw.prepare('SELECT token_hash FROM sessions').all();
    expect(JSON.stringify(sessions)).not.toContain(made.token);
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
    const who = await account();
    for (const body of [
      { group: '', me: 'מתן' },
      { group: 'x'.repeat(500), me: 'מתן' },
      { group: 5, me: 'מתן' },
      { group: 'a', me: 'b', role: 'owner' },
    ])
      expect((await call('POST', '/groups', { token: who.token, body })).status).toBe(400);
  });

  it('needs a signed-in account', async () => {
    const body = { group: 'ק', me: 'א' };
    expect((await call('POST', '/groups', { body })).status).toBe(401);
    expect((await call('POST', '/groups', { token: newToken(), body })).status).toBe(401);
  });

  it('keeps at most the limit of groups to one owner', async () => {
    const who = await account();
    for (let i = 0; i < LIMITS.groupsPerAccount; i++)
      expect(
        (await call('POST', '/groups', { token: who.token, body: { group: `ק${i}`, me: 'א' } }))
          .status,
      ).toBe(201);
    const more = await call('POST', '/groups', {
      token: who.token,
      body: { group: 'עוד', me: 'א' },
    });
    expect(more.status).toBe(409);
  });
});

describe('the invite', () => {
  it('shows the group before joining, and lets a new name in as a member', async () => {
    const made = await create();
    const preview = parsePreview(
      await (await call('GET', `/groups/${made.group.id}/preview`, { invite: made.invite })).json(),
    );
    expect(preview).toEqual({
      name: 'החברים',
      members: [{ name: 'מתן', role: 'owner', held: true }],
    });
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
  it('lets a name nobody holds be claimed, only when asked, and puts it in the log', async () => {
    const made = await create();
    // A name no account holds: the seeded archive group's members are like this.
    env.DB.raw
      .prepare(
        "INSERT INTO members (id, group_id, name, role, joined_at) VALUES ('m'||hex(randomblob(10)), ?, 'עדי', 'member', 0)",
      )
      .run(made.group.id);
    const asked = await joinAs(made.group.id, made.invite, 'עדי');
    expect(asked.status).toBe(409);
    expect(await asked.json()).toMatchObject({ code: 'name-taken' });
    const claimed = await joinAs(made.group.id, made.invite, 'עדי', true);
    expect(claimed.status).toBe(201);
    const log = await (
      await call('GET', `/groups/${made.group.id}/audit`, { token: made.token })
    ).json();
    expect(JSON.stringify(log)).toContain('member.claim');
  });

  it("never lets a name an account holds be claimed by another, a manager's included", async () => {
    const made = await create();
    await joined(made.group.id, made.invite, 'עדי');
    for (const name of ['מתן', 'עדי']) {
      const refused = await joinAs(made.group.id, made.invite, name, true);
      expect(refused.status).toBe(409);
      expect(await refused.json()).toMatchObject({ code: 'name-taken' });
    }
  });

  it('lets an account in only once: joining again is reading the group', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    const again = await joinAs(made.group.id, made.invite, 'משהו אחר', false, adi.token);
    expect(again.status).toBe(200);
    expect(parseJoined(await again.json())?.group.me.name).toBe('עדי');
    expect((await call('GET', `/groups/${made.group.id}`, { token: made.token })).status).toBe(200);
  });

  it('shows who holds a name before joining', async () => {
    const made = await create();
    env.DB.raw.prepare('UPDATE members SET account_id = NULL').run();
    const preview = parsePreview(
      await (await call('GET', `/groups/${made.group.id}/preview`, { invite: made.invite })).json(),
    );
    expect(preview?.members).toEqual([{ name: 'מתן', role: 'owner', held: false }]);
    const claimed = await joinAs(made.group.id, made.invite, 'מתן', true);
    expect(claimed.status).toBe(201);
    expect(parseJoined(await claimed.json())?.group.me.role).toBe('owner');
  });

  it('turns a freed admin back into a player, so the name cannot bring the role back', async () => {
    const made = await create();
    const adi = await joined(made.group.id, made.invite, 'עדי');
    await call('PUT', `/groups/${made.group.id}/members/${adi.group.me.id}/role`, {
      token: made.token,
      body: { role: 'admin' },
    });
    await call('DELETE', `/groups/${made.group.id}/members/${adi.group.me.id}/claim`, {
      token: made.token,
    });
    const back = parseJoined(await (await joinAs(made.group.id, made.invite, 'עדי', true)).json());
    expect(back?.group.me.role).toBe('member');
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

  it('let an admin free a player, never the owner; another admin only the owner can', async () => {
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
      call('DELETE', `/groups/${made.group.id}/members/${id}/claim`, { token: who });
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
      `/groups/${made.group.id}/members/${other.group.me.id}/claim`,
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
    for (let i = 0; i < LIMITS.groupsPerAddressPerDay; i++) {
      const who = await account();
      const body = { group: `ק${i}`, me: 'א' };
      expect(
        (await call('POST', '/groups', { from: '9.9.9.9', token: who.token, body })).status,
      ).toBe(201);
    }
    const who = await account();
    const body = { group: 'עוד', me: 'א' };
    expect(
      (await call('POST', '/groups', { from: '9.9.9.9', token: who.token, body })).status,
    ).toBe(429);
  });

  it('stops new groups at the total limit', async () => {
    const insert = env.DB.raw.prepare(
      'INSERT INTO groups (id, name, invite_hash, created_at) VALUES (?, ?, ?, 0)',
    );
    for (let i = 0; i < LIMITS.groupsTotal; i++) insert.run(`g${i}`.padEnd(22, 'x'), `${i}`, 'h');
    const who = await account();
    const full = await call('POST', '/groups', {
      token: who.token,
      body: { group: 'אחרונה', me: 'א' },
    });
    expect(full.status).toBe(503);
    expect(await full.json()).toMatchObject({ code: 'service-full' });
  });

  it('caps writes from one session a minute', async () => {
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
