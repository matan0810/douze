// The real Worker (worker/src/app.ts), run in Node for the browser test, on Node's own
// SQLite with the real migrations: the same code and SQL as on Cloudflare, with no account.
// Google is stood in for by a tiny server of the browser test's own: it signs in whoever the
// test says next, so every sign-in goes through the Worker's real flow.

import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

export const API_PORT = 8788;
export const GOOGLE_PORT = 8789;
const CLIENT_ID = 'e2e-client';

export async function startApi() {
  // Vite loads the Worker's TypeScript as it is, with its extension-less imports.
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });
  const { handle } = await vite.ssrLoadModule('/worker/src/app.ts');
  const { testDatabase } = await vite.ssrLoadModule('/worker/test/sqlite.ts');
  const google = `http://localhost:${GOOGLE_PORT}`;
  const env = {
    ALLOWED_ORIGINS: '',
    DB: testDatabase(),
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: 'e2e-secret',
    GOOGLE_AUTH_URL: `${google}/authorize`,
    GOOGLE_TOKEN_URL: `${google}/token`,
  };
  // Who signs in next: set by the test just before it clicks "Sign in with Google".
  let next = { email: 'someone@example.test', name: 'Someone', sub: 'sub-someone' };
  const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const fake = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? '/', google);
    if (url.pathname === '/authorize') {
      // The person "chooses an account": straight back to the Worker with a code that says who.
      const code = base64url({ ...next, nonce: url.searchParams.get('nonce') });
      const back = new URL(url.searchParams.get('redirect_uri') ?? '');
      back.search = new URLSearchParams({ code, state: url.searchParams.get('state') ?? '' });
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const form = new URLSearchParams(Buffer.concat(chunks).toString());
      const who = JSON.parse(Buffer.from(form.get('code') ?? '', 'base64url').toString());
      const claims = {
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 600,
        nonce: who.nonce,
        sub: who.sub,
        email: who.email,
        email_verified: true,
        name: who.name,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id_token: `x.${base64url(claims)}.x` }));
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => fake.listen(GOOGLE_PORT, 'localhost', resolve));
  const quiet = console.log;
  const http = createHttpServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers(
      Object.entries(req.headers).filter(([, value]) => typeof value === 'string'),
    );
    const request = new Request(`http://localhost:${API_PORT}${req.url}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method ?? '') ? undefined : Buffer.concat(chunks),
    });
    // The Worker's own log line per request is noise here.
    console.log = () => undefined;
    const answer = await handle(request, env);
    console.log = quiet;
    res.writeHead(answer.status, Object.fromEntries(answer.headers));
    res.end(Buffer.from(await answer.arrayBuffer()));
  });
  await new Promise((resolve) => http.listen(API_PORT, 'localhost', resolve));
  return {
    /** The next person to sign in with Google, by their own email and name. */
    signInAs: (email, name) => {
      next = { email, name, sub: `sub-${email}` };
    },
    /** Lets the site's origin call the API, once the preview server has its port. */
    allow: (origin) => {
      env.ALLOWED_ORIGINS = origin;
    },
    close: async () => {
      await new Promise((resolve) => http.close(resolve));
      await new Promise((resolve) => fake.close(resolve));
      await vite.close();
    },
  };
}
