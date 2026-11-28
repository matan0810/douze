import { LIMITS } from '../../shared/config';
import { parseCodeBody } from '../../shared/accounts';
import { newId, isSecret } from '../../shared/ids';
import { hashToken, newToken } from '../../shared/tokens';
import { cleanName } from '../../shared/names';
import type { Env } from './env';
import { signedIn } from './auth';
import { body } from './groups';
import { HttpError, json } from './http';
import { address, hit } from './rate';
import { first, int, text, type Sql } from './sql';

/**
 * Sign in with Google (SERVER.md, "Identity", level 3): the authorization-code flow, with the
 * Worker holding the client secret. The site only navigates: to `/auth/google/start`, then to
 * Google, back to `/auth/google/callback`, and home with a one-time code in the address that
 * it exchanges for a session. No script from Google ever runs on the site.
 */
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const MINUTE = 60 * 1000;
const SESSION_DAYS = 90;
const TIMEOUT = 8000;

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

/** A return address on one of the site's own origins, without its fragment, or undefined. */
function allowedReturn(raw: string | null, env: Env): string | undefined {
  if (!raw || raw.length > 300) return undefined;
  try {
    const url = new URL(raw);
    const allowed = env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim());
    if (!allowed.includes(url.origin)) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function startSignIn(request: Request, env: Env): Promise<Response> {
  const { GOOGLE_CLIENT_ID: clientId } = env;
  if (!clientId || !env.GOOGLE_CLIENT_SECRET)
    throw new HttpError(503, 'Sign-in is not set up', 'service-full');
  const returnTo = allowedReturn(new URL(request.url).searchParams.get('return'), env);
  if (!returnTo) throw new HttpError(400, 'Bad request', 'bad-request');
  await hit(env.DB, 'signin', address(request), LIMITS.signInsPerHour, 60 * 60);
  const state = newToken();
  const nonce = newToken();
  await env.DB.prepare(
    'INSERT INTO sign_ins (state_hash, nonce, return_to, expires_at) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(await hashToken(state), nonce, returnTo, Date.now() + 10 * MINUTE)
    .run();
  const url = new URL(env.GOOGLE_AUTH_URL ?? AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${new URL(request.url).origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();
  return redirect(url.toString());
}

interface Claims {
  sub: string;
  email: string;
  name: string;
}

/**
 * The id token Google's token endpoint answered with, over TLS directly to this Worker: its
 * claims are checked (issuer, audience, expiry, nonce, verified email) as OpenID Connect
 * asks; the signature need not be, for a token received from the endpoint itself.
 */
function claimsOf(idToken: unknown, clientId: string, nonce: string): Claims | undefined {
  if (typeof idToken !== 'string') return undefined;
  const part = idToken.split('.')[1];
  if (!part) return undefined;
  let payload: unknown;
  try {
    const bytes = Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
  if (typeof payload !== 'object' || payload === null) return undefined;
  const c: Record<string, unknown> = Object.fromEntries(Object.entries(payload));
  const verified = c.email_verified === true || c.email_verified === 'true';
  const email = typeof c.email === 'string' ? c.email.toLowerCase() : '';
  if (
    typeof c.iss !== 'string' ||
    !ISSUERS.includes(c.iss) ||
    c.aud !== clientId ||
    typeof c.exp !== 'number' ||
    c.exp * 1000 < Date.now() ||
    c.nonce !== nonce ||
    !verified ||
    typeof c.sub !== 'string' ||
    !c.sub ||
    c.sub.length > 100 ||
    !email ||
    email.length > 200
  )
    return undefined;
  const name = cleanName(typeof c.name === 'string' ? c.name : (email.split('@')[0] ?? ''), 30);
  return { sub: c.sub, email, name: name || 'Douze' };
}

/** The account of a Google identity: made on the first sign-in, its name and email kept fresh. */
async function accountFor(sql: Sql, claims: Claims): Promise<string> {
  const now = Date.now();
  const row = await first(
    sql.prepare('SELECT id FROM accounts WHERE google_sub = ?1').bind(claims.sub),
  );
  const id = row ? text(row, 'id') : newId();
  await sql.batch([
    sql
      .prepare(
        `INSERT INTO accounts (id, google_sub, email, name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email, name = excluded.name`,
      )
      .bind(id, claims.sub, claims.email, claims.name, now),
    // A name waiting for this email (the seeded archive group's owner) is theirs now, in
    // every group that has one and has not got this account yet.
    sql
      .prepare(
        `UPDATE members SET account_id = ?1, claim_email = NULL
         WHERE claim_email = ?2 AND account_id IS NULL
           AND group_id NOT IN (SELECT group_id FROM members WHERE account_id = ?1)`,
      )
      .bind(id, claims.email),
  ]);
  return id;
}

export async function finishSignIn(request: Request, env: Env): Promise<Response> {
  const sql = env.DB;
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: secret } = env;
  const params = new URL(request.url).searchParams;
  const state = params.get('state') ?? '';
  if (!clientId || !secret || !isSecret(state))
    throw new HttpError(400, 'Bad request', 'bad-request');
  const stateHash = await hashToken(state);
  const pending = await first(
    sql
      .prepare('DELETE FROM sign_ins WHERE state_hash = ?1 RETURNING nonce, return_to, expires_at')
      .bind(stateHash),
  );
  // A state is good once: a replayed or forged one finds nothing.
  if (!pending || int(pending, 'expires_at') < Date.now())
    throw new HttpError(400, 'Bad request', 'bad-request');
  const home = text(pending, 'return_to');
  const failed = () => redirect(`${home}#/signed/failed`);
  const code = params.get('code') ?? '';
  if (params.has('error') || !code || code.length > 2000) return failed();
  let answer: unknown;
  try {
    const response = await fetch(env.GOOGLE_TOKEN_URL ?? TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: secret,
        redirect_uri: `${new URL(request.url).origin}/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    answer = response.ok ? await response.json() : undefined;
  } catch {
    return failed();
  }
  const token =
    typeof answer === 'object' && answer !== null && 'id_token' in answer ? answer.id_token : null;
  const claims = claimsOf(token, clientId, text(pending, 'nonce'));
  if (!claims) return failed();
  const account = await accountFor(sql, claims);
  const loginCode = newToken();
  await sql
    .prepare('INSERT INTO login_codes (code_hash, account_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(await hashToken(loginCode), account, Date.now() + 2 * MINUTE)
    .run();
  return redirect(`${home}#/signed/${loginCode}`);
}

/** The code from the address, once, for a session on this device. */
export async function collectSession(request: Request, env: Env): Promise<Response> {
  const sql = env.DB;
  await hit(sql, 'collect', address(request), LIMITS.signInsPerHour * 3, 60 * 60);
  const { code } = await body(request, parseCodeBody);
  const row = await first(
    sql
      .prepare('DELETE FROM login_codes WHERE code_hash = ?1 RETURNING account_id, expires_at')
      .bind(await hashToken(code)),
  );
  if (!row || int(row, 'expires_at') < Date.now())
    throw new HttpError(401, 'Not signed in', 'unauthorized');
  const account = await first(
    sql.prepare('SELECT name FROM accounts WHERE id = ?1').bind(text(row, 'account_id')),
  );
  if (!account) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const token = newToken();
  const now = Date.now();
  await sql
    .prepare(
      'INSERT INTO sessions (token_hash, account_id, created_at, seen_at, expires_at) VALUES (?1, ?2, ?3, ?3, ?4)',
    )
    .bind(
      await hashToken(token),
      text(row, 'account_id'),
      now,
      now + SESSION_DAYS * 24 * 60 * MINUTE,
    )
    .run();
  return json({ token, name: text(account, 'name') }, 201);
}

/** Ends this session: the token stops working at once, on this device and anywhere it was. */
export async function signOut(request: Request, env: Env): Promise<Response> {
  const who = await signedIn(request, env.DB);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(who.tokenHash).run();
  return new Response(null, { status: 204 });
}
