import { isId } from '../../shared/ids';
import type { Env } from './env';
import {
  auditLog,
  createGroup,
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

/** The service's name, as the health address reports it. */
export const SERVICE = 'douze-api';

type Handler = (request: Request, env: Env, ids: string[]) => Promise<Response>;

/**
 * Every address the API answers, by method and path; `:id` is a group's or member's id,
 * checked before any handler runs. Anything else is a 404: deny by default.
 */
const ROUTES: [method: string, path: string, run: Handler][] = [
  ['GET', '/health', async () => json({ ok: true, service: SERVICE })],
  ['POST', '/groups', (r, e) => createGroup(r, e)],
  ['GET', '/groups/:id', (r, e, [g = '']) => readGroup(r, e, g)],
  ['DELETE', '/groups/:id', (r, e, [g = '']) => deleteGroup(r, e, g)],
  ['GET', '/groups/:id/preview', (r, e, [g = '']) => preview(r, e, g)],
  ['POST', '/groups/:id/join', (r, e, [g = '']) => join(r, e, g)],
  ['POST', '/groups/:id/invite', (r, e, [g = '']) => rotateInvite(r, e, g)],
  ['GET', '/groups/:id/audit', (r, e, [g = '']) => auditLog(r, e, g)],
  ['DELETE', '/groups/:id/members/me', (r, e, [g = '']) => leave(r, e, g)],
  ['PUT', '/groups/:id/members/:id/role', (r, e, [g = '', m = '']) => setRole(r, e, g, m)],
  ['DELETE', '/groups/:id/members/:id/devices', (r, e, [g = '', m = '']) => release(r, e, g, m)],
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
