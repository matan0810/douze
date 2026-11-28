import { beforeEach, expect, vi } from 'vitest';
import { parseJoined } from '../../shared/groups';
import { newId } from '../../shared/ids';
import { hashToken, newToken } from '../../shared/tokens';
import { handle } from '../src/app';
import type { Env } from '../src/env';
import { testDatabase } from './sqlite';

/**
 * The Worker as the tests call it: a fresh database for every test, a request from its own
 * internet address unless one is given, and the steps most tests start with.
 */
export const env: Env & { DB: ReturnType<typeof testDatabase> } = {
  ALLOWED_ORIGINS: 'http://localhost:5173',
  DB: testDatabase(),
};
let ip = 0;

beforeEach(() => {
  env.DB = testDatabase();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

export function call(
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

let people = 0;

/**
 * A signed-in account, made straight in the database (Google's own flow is tested apart,
 * in `google.test.ts`): its session token, as the site would hold it.
 */
export async function account(name = 'Tester', email?: string) {
  const n = ++people;
  const id = newId();
  const token = newToken();
  const now = Date.now();
  env.DB.raw
    .prepare(
      'INSERT INTO accounts (id, google_sub, email, name, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, `sub-${n}`, email ?? `person${n}@example.test`, name, now);
  env.DB.raw
    .prepare(
      'INSERT INTO sessions (token_hash, account_id, created_at, seen_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(await hashToken(token), id, now, now, now + 86_400_000);
  return { id, token };
}

/** A group made by a new account: what came back, with the owner's session token. */
export async function create(group = 'החברים', me = 'מתן') {
  const owner = await account(me);
  const answer = await call('POST', '/groups', { token: owner.token, body: { group, me } });
  expect(answer.status).toBe(201);
  const made = parseJoined(await answer.json());
  if (!made?.invite) throw new Error('no group');
  return { ...made, invite: made.invite, token: owner.token, account: owner.id };
}

/** Joins as the given account, or as a new one. */
export async function joinAs(
  groupId: string,
  invite: string,
  name: string,
  claim = false,
  token?: string,
) {
  const who = token ? { token } : await account(name);
  return call('POST', `/groups/${groupId}/join`, {
    token: who.token,
    invite,
    body: { name, claim },
  });
}

/** A new account joined under a name, with its session token. */
export async function joined(groupId: string, invite: string, name: string) {
  const who = await account(name);
  const answer = await joinAs(groupId, invite, name, false, who.token);
  const made = parseJoined(await answer.json());
  if (!made) throw new Error('not joined');
  return { ...made, token: who.token, account: who.id };
}
