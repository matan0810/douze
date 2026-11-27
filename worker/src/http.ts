import type { ErrorCode } from '../../shared/groups';
import type { Env } from './env';

/** An error that is the caller's to see: its status and its (safe) message. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** A code from the closed list the site turns into words (`shared/groups.ts`). */
    readonly code?: ErrorCode,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Sent with every answer: no sniffing, no caching, no referrer. */
const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
};

/** CORS headers for an allowed origin (the site's own); none at all for any other. */
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

/** Reads a JSON body, refusing anything larger than `maxBytes` (and anything that is not JSON). */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > maxBytes) throw new HttpError(413, 'Request body is too large', 'bad-request');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new HttpError(413, 'Request body is too large', 'bad-request');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON', 'bad-request');
  }
}

/**
 * Runs a handler and turns what it throws into an answer. An `HttpError` says what it chose
 * to say; anything else is a plain 500 that names nothing: no message, no stack, no data.
 */
export async function guard(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError)
      return json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        error.status,
        error.headers,
      );
    // Only the kind of error is logged, never its message, which may hold a secret.
    console.error('unhandled', error instanceof Error ? error.name : typeof error);
    return json({ error: 'Something went wrong' }, 500);
  }
}
