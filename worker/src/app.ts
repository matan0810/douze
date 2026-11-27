import type { Env } from './env';
import { corsHeaders, guard, HttpError, json } from './http';

/** The service's name, as the health address reports it. */
export const SERVICE = 'douze-api';

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === '/health') {
    if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    return json({ ok: true, service: SERVICE });
  }
  throw new HttpError(404, 'Not found');
}

/**
 * Every request: preflight, the router inside `guard`, CORS for the site's own origin, and
 * one log line (method, path and status: no address, no header, no body).
 */
export async function handle(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);
  const answer =
    request.method === 'OPTIONS'
      ? new Response(null, { status: 204, headers: cors })
      : await guard(() => route(request));
  for (const [name, value] of Object.entries(cors)) answer.headers.set(name, value);
  console.log(request.method, new URL(request.url).pathname, answer.status);
  return answer;
}
