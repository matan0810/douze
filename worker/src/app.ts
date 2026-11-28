import { isId } from '../../shared/ids';
import { isStage, isYear, type Stage } from '../../shared/years';
import type { Env } from './env';
import { collectSession, finishSignIn, signOut, startSignIn } from './google';
import {
  auditLog,
  createGroup,
  myGroups,
  deleteGroup,
  join,
  leave,
  preview,
  readGroup,
  release,
  rotateInvite,
  setRole,
} from './groups';
import { corsHeaders, guard, HttpError, json } from './http';
import {
  closeStage,
  listYears,
  readYear,
  removeStage,
  saveEntry,
  setResult,
  setStage,
} from './years';

/** The service's name, as the health address reports it. */
export const SERVICE = 'douze-api';

type Handler = (request: Request, env: Env, ids: string[]) => Promise<Response>;

/** A year and a stage from a path already checked by `match`. */
function yearStage(year = '', stage = ''): [number, Stage] {
  const y = Number(year);
  if (!isYear(y) || !isStage(stage)) throw new HttpError(404, 'Not found', 'not-found');
  return [y, stage];
}

/**
 * Every address the API answers, by method and path; `:id` is a group's or member's id,
 * checked before any handler runs. Anything else is a 404: deny by default.
 */
const ROUTES: [method: string, path: string, run: Handler][] = [
  ['GET', '/health', async () => json({ ok: true, service: SERVICE })],
  ['GET', '/auth/google/start', (r, e) => startSignIn(r, e)],
  ['GET', '/auth/google/callback', (r, e) => finishSignIn(r, e)],
  ['POST', '/auth/session', (r, e) => collectSession(r, e)],
  ['DELETE', '/auth/session', (r, e) => signOut(r, e)],
  ['GET', '/me', (r, e) => myGroups(r, e)],
  ['POST', '/groups', (r, e) => createGroup(r, e)],
  ['GET', '/groups/:id', (r, e, [g = '']) => readGroup(r, e, g)],
  ['DELETE', '/groups/:id', (r, e, [g = '']) => deleteGroup(r, e, g)],
  ['GET', '/groups/:id/preview', (r, e, [g = '']) => preview(r, e, g)],
  ['POST', '/groups/:id/join', (r, e, [g = '']) => join(r, e, g)],
  ['POST', '/groups/:id/invite', (r, e, [g = '']) => rotateInvite(r, e, g)],
  ['GET', '/groups/:id/audit', (r, e, [g = '']) => auditLog(r, e, g)],
  ['DELETE', '/groups/:id/members/me', (r, e, [g = '']) => leave(r, e, g)],
  ['PUT', '/groups/:id/members/:id/role', (r, e, [g = '', m = '']) => setRole(r, e, g, m)],
  ['DELETE', '/groups/:id/members/:id/claim', (r, e, [g = '', m = '']) => release(r, e, g, m)],
  ['GET', '/groups/:id/years', (r, e, [g = '']) => listYears(r, e, g)],
  [
    'GET',
    '/groups/:id/years/:year',
    (r, e, [g = '', y]) => readYear(r, e, g, yearStage(y, 'final')[0]),
  ],
  [
    'PUT',
    '/groups/:id/years/:year/:stage',
    (r, e, [g = '', y, s]) => setStage(r, e, g, ...yearStage(y, s)),
  ],
  [
    'DELETE',
    '/groups/:id/years/:year/:stage',
    (r, e, [g = '', y, s]) => removeStage(r, e, g, ...yearStage(y, s)),
  ],
  [
    'PUT',
    '/groups/:id/years/:year/:stage/result',
    (r, e, [g = '', y, s]) => setResult(r, e, g, ...yearStage(y, s)),
  ],
  [
    'POST',
    '/groups/:id/years/:year/:stage/close',
    (r, e, [g = '', y, s]) => closeStage(r, e, g, ...yearStage(y, s)),
  ],
  [
    'PUT',
    '/groups/:id/years/:year/:stage/entry',
    (r, e, [g = '', y, s]) => saveEntry(r, e, g, ...yearStage(y, s)),
  ],
];

/** The ids in `path` if it fits `pattern`, or undefined. */
function match(pattern: string, path: string): string[] | undefined {
  const want = pattern.split('/');
  const have = path.split('/');
  if (want.length !== have.length) return undefined;
  const ids: string[] = [];
  for (const [i, part] of want.entries()) {
    const value = have[i] ?? '';
    if (part === ':id') {
      if (!isId(value)) return undefined;
      ids.push(value);
    } else if (part === ':year') {
      if (!/^\d{4}$/.test(value) || !isYear(Number(value))) return undefined;
      ids.push(value);
    } else if (part === ':stage') {
      if (!isStage(value)) return undefined;
      ids.push(value);
    } else if (part !== value) return undefined;
  }
  return ids;
}

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  let known = false;
  for (const [method, pattern, run] of ROUTES) {
    const ids = match(pattern, pathname);
    if (!ids) continue;
    known = true;
    if (method === request.method) return run(request, env, ids);
  }
  if (known) throw new HttpError(405, 'Method not allowed', 'bad-request');
  throw new HttpError(404, 'Not found', 'not-found');
}

/**
 * Every request: preflight, the router inside `guard`, CORS for the site's own origin, and
 * one log line (method, the path's shape and status: no address, no id, no header, no body).
 */
export async function handle(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);
  const answer =
    request.method === 'OPTIONS'
      ? new Response(null, { status: 204, headers: cors })
      : await guard(() => route(request, env));
  for (const [name, value] of Object.entries(cors)) answer.headers.set(name, value);
  const shape = new URL(request.url).pathname.replace(/[A-Za-z0-9_-]{22}/g, ':id');
  console.log(request.method, shape, answer.status);
  return answer;
}
