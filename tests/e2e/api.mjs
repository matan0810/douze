// The real Worker (worker/src/app.ts), run in Node for the browser test, on Node's own
// SQLite with the real migrations: the same code and SQL as on Cloudflare, with no account.

import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

export const API_PORT = 8788;

export async function startApi() {
  // Vite loads the Worker's TypeScript as it is, with its extension-less imports.
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });
  const { handle } = await vite.ssrLoadModule('/worker/src/app.ts');
  const { testDatabase } = await vite.ssrLoadModule('/worker/test/sqlite.ts');
  const env = { ALLOWED_ORIGINS: '', DB: testDatabase() };
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
    /** Lets the site's origin call the API, once the preview server has its port. */
    allow: (origin) => {
      env.ALLOWED_ORIGINS = origin;
    },
    close: async () => {
      await new Promise((resolve) => http.close(resolve));
      await vite.close();
    },
  };
}
