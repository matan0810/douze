import { beforeEach, expect, vi } from 'vitest';
import { parseJoined } from '../../shared/groups';
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

export async function create(group = 'החברים', me = 'מתן') {
  const answer = await call('POST', '/groups', { body: { group, me } });
  expect(answer.status).toBe(201);
  const made = parseJoined(await answer.json());
  if (!made?.invite) throw new Error('no group');
  return { ...made, invite: made.invite };
}

export async function joinAs(groupId: string, invite: string, name: string, takeover = false) {
  return call('POST', `/groups/${groupId}/join`, { invite, body: { name, takeover } });
}

export async function joined(groupId: string, invite: string, name: string) {
  const made = parseJoined(await (await joinAs(groupId, invite, name)).json());
  if (!made) throw new Error('not joined');
  return made;
}
