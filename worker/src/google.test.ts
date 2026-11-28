import { describe, expect, it, vi } from 'vitest';
import { parseMe, parseSession } from '../../shared/accounts';
import { call, create, env, joinAs } from '../test/client';
import { CLIENT, codeOf, finish, ok, SITE, start, withGoogle } from '../test/google';
import { handle } from './app';

describe('signing in with Google', () => {
  it('sends the person to Google with a state and a nonce, back to this Worker', async () => {
    withGoogle();
    const { url } = await start();
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe(CLIENT);
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.test/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
  });

  it('comes home with a one-time code, which becomes a session, once', async () => {
    withGoogle();
    const { state, nonce } = await start();
    const back = await finish(state, (n) => ok(n), nonce);
    expect(back.status).toBe(302);
    expect(back.headers.get('Location')).toMatch(
      /^http:\/\/localhost:5173\/douze\/#\/signed\/[\w-]{43}$/,
    );
    const code = codeOf(back);
    const session = await call('POST', '/auth/session', { body: { code } });
    expect(session.status).toBe(201);
    const made = parseSession(await session.json());
    expect(made?.name).toBe('מתן לביא');
    expect((await call('POST', '/auth/session', { body: { code } })).status).toBe(401);
    const stored = JSON.stringify(env.DB.raw.prepare('SELECT * FROM sessions').all());
    expect(stored).not.toContain(made?.token ?? 'x');
  });

  it('knows the person again by Google’s id, whatever their email becomes, and lists their groups', async () => {
    withGoogle();
    const first = await start();
    const a = await finish(first.state, (n) => ok(n), first.nonce);
    const sessionA = parseSession(
      await (await call('POST', '/auth/session', { body: { code: codeOf(a) } })).json(),
    );
    const owner = await create();
    expect(owner.group.me.role).toBe('owner');
    const second = await start();
    const b = await finish(second.state, (n) => ok(n, { email: 'new@example.test' }), second.nonce);
    const sessionB = parseSession(
      await (await call('POST', '/auth/session', { body: { code: codeOf(b) } })).json(),
    );
    expect(
      env.DB.raw
        .prepare('SELECT COUNT(*) AS n FROM accounts WHERE google_sub = ?')
        .get('google-sub-1'),
    ).toEqual({ n: 1 });
    const mine = parseMe(await (await call('GET', '/me', { token: sessionB?.token })).json());
    expect(mine).toEqual({ name: 'מתן לביא', groups: [] });
    // The first session still works, and ends when asked.
    expect((await call('GET', '/me', { token: sessionA?.token })).status).toBe(200);
    expect((await call('DELETE', '/auth/session', { token: sessionA?.token })).status).toBe(204);
    expect((await call('GET', '/me', { token: sessionA?.token })).status).toBe(401);
  });

  it('refuses a token whose claims are wrong, one at a time', async () => {
    withGoogle();
    const bad: Record<string, unknown>[] = [
      { iss: 'https://evil.example' },
      { aud: 'someone-else' },
      { exp: Math.floor(Date.now() / 1000) - 10 },
      { nonce: 'not-the-one' },
      { email_verified: false },
      { sub: '' },
      { email: '' },
    ];
    for (const change of bad) {
      const { state, nonce } = await start();
      const back = await finish(state, (n) => ok(n, change), nonce);
      expect(back.headers.get('Location'), JSON.stringify(change)).toMatch(/#\/signed\/failed$/);
    }
    expect(env.DB.raw.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 0 });
  });

  it('takes a state once, and refuses one it never gave', async () => {
    withGoogle();
    const { state, nonce } = await start();
    expect((await finish(state, (n) => ok(n), nonce)).status).toBe(302);
    const replay = await finish(state, (n) => ok(n), nonce);
    expect(replay.status).toBe(400);
    const forged = await finish('A'.repeat(43), (n) => ok(n), nonce);
    expect(forged.status).toBe(400);
  });

  it('returns only to the site’s own origins, and is off without Google set up', async () => {
    withGoogle();
    expect(
      (
        await call(
          'GET',
          `/auth/google/start?return=${encodeURIComponent('https://evil.example/')}`,
        )
      ).status,
    ).toBe(400);
    expect((await call('GET', '/auth/google/start')).status).toBe(400);
    delete env.GOOGLE_CLIENT_ID;
    expect(
      (await call('GET', `/auth/google/start?return=${encodeURIComponent(SITE)}`)).status,
    ).toBe(503);
  });

  it('survives Google being down or answering badly', async () => {
    withGoogle();
    const { state, nonce } = await start();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    const back = await handle(
      new Request(`https://api.test/auth/google/callback?code=abc&state=${state}`),
      env,
    );
    expect(back.headers.get('Location')).toMatch(/#\/signed\/failed$/);
    expect(nonce).toBeTruthy();
  });

  it('gives a name waiting for an email to the account with that email, once', async () => {
    withGoogle();
    const made = await create();
    env.DB.raw
      .prepare(
        "UPDATE members SET account_id = NULL, claim_email = 'matan@example.test' WHERE group_id = ?",
      )
      .run(made.group.id);
    const { state, nonce } = await start();
    const back = await finish(state, (n) => ok(n), nonce);
    const session = parseSession(
      await (await call('POST', '/auth/session', { body: { code: codeOf(back) } })).json(),
    );
    const mine = parseMe(await (await call('GET', '/me', { token: session?.token })).json());
    expect(mine?.groups.map((g) => [g.name, g.me.name, g.me.role])).toEqual([
      ['החברים', 'מתן', 'owner'],
    ]);
    // The same name is not given to anyone else, and joining the group again just reads it.
    const again = await joinAs(made.group.id, made.invite, 'מתן', true, session?.token);
    expect(again.status).toBe(200);
  });
});
