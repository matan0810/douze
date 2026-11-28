import { afterEach, expect, vi } from 'vitest';
import { handle } from '../src/app';
import { call, env } from './client';

/**
 * Google's side, stood in for: the token endpoint answers with an id token carrying the claims
 * a test chooses. Everything the Worker checks about it is checked here, one claim at a time.
 */
export const CLIENT = 'client-123.apps.example';
export const SITE = 'http://localhost:5173/douze/';

function idToken(claims: Record<string, unknown>): string {
  const part = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`;
}

export const ok = (nonce: string, extra: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: CLIENT,
  exp: Math.floor(Date.now() / 1000) + 600,
  nonce,
  sub: 'google-sub-1',
  email: 'Matan@Example.test',
  email_verified: true,
  name: 'מתן לביא',
  ...extra,
});

export const withGoogle = (): void => {
  env.GOOGLE_CLIENT_ID = CLIENT;
  env.GOOGLE_CLIENT_SECRET = 'secret';
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
});

/** Starts a sign-in; the state and nonce Google would be given. */
export async function start(returnTo = SITE) {
  const answer = await call('GET', `/auth/google/start?return=${encodeURIComponent(returnTo)}`);
  expect(answer.status).toBe(302);
  const url = new URL(answer.headers.get('Location') ?? '');
  return {
    url,
    state: url.searchParams.get('state') ?? '',
    nonce: url.searchParams.get('nonce') ?? '',
  };
}

/** Google redirects back with a code; its token endpoint answers with these claims. */
export async function finish(
  state: string,
  claims: (nonce: string) => Record<string, unknown>,
  nonce: string,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ id_token: idToken(claims(nonce)) }))),
  );
  return handle(
    new Request(`https://api.test/auth/google/callback?code=abc&state=${state}`, {
      headers: { 'CF-Connecting-IP': '10.1.1.1' },
    }),
    env,
  );
}

export const codeOf = (answer: Response) =>
  (answer.headers.get('Location') ?? '').split('#/signed/')[1];
