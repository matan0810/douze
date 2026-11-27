import { describe, expect, it, vi } from 'vitest';
import type { Env } from './env';
import { guard, HttpError, json, readJson } from './http';
import { testDatabase } from '../test/sqlite';
import { handle, SERVICE } from './app';

const env: Env = {
  ALLOWED_ORIGINS: 'https://matan0810.github.io, http://localhost:5173',
  DB: testDatabase(),
};
const call = (path: string, init?: RequestInit) =>
  handle(new Request(`https://api.test${path}`, init), env);

describe('the health address', () => {
  it('answers, and says what it is', async () => {
    const answer = await call('/health');
    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual({ ok: true, service: SERVICE });
  });

  it('is never cached, sniffed or sent with a referrer', async () => {
    const { headers } = await call('/health');
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('refuses a method it does not take', async () => {
    expect((await call('/health', { method: 'POST' })).status).toBe(405);
  });
});

describe('the rest of the address space', () => {
  it('is denied by default: an unknown path is a plain 404', async () => {
    const answer = await call('/anything');
    expect(answer.status).toBe(404);
    expect(await answer.json()).toEqual({ error: 'Not found', code: 'not-found' });
  });
});

describe('CORS', () => {
  it("lets the site's own origin read the answer", async () => {
    const answer = await call('/health', { headers: { Origin: 'https://matan0810.github.io' } });
    expect(answer.headers.get('Access-Control-Allow-Origin')).toBe('https://matan0810.github.io');
    expect(answer.headers.get('Vary')).toBe('Origin');
  });

  it('gives any other origin nothing, not even on an error', async () => {
    for (const path of ['/health', '/nothing']) {
      const answer = await call(path, { headers: { Origin: 'https://evil.example' } });
      expect(answer.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
  });

  it('answers a preflight with no body, for the site only', async () => {
    const ok = await call('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    // the invitation's secret travels in its own header: the browser must be allowed to send it
    expect(ok.headers.get('Access-Control-Allow-Headers')).toContain('X-Invite');
    const other = await call('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'https://x.test' },
    });
    expect(other.status).toBe(204);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('what a request may carry', () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://api.test/x', { method: 'POST', body, headers });

  it('is read as JSON', async () => {
    expect(await readJson(post('{"a":1}'), 100)).toEqual({ a: 1 });
  });

  it('is refused when too big, by its declared size or its real one', async () => {
    await expect(
      readJson(post('x'.repeat(200), { 'Content-Length': '200' }), 100),
    ).rejects.toMatchObject({
      status: 413,
    });
    await expect(readJson(post(JSON.stringify({ a: 'é'.repeat(60) })), 100)).rejects.toMatchObject({
      status: 413,
    });
  });

  it('is refused when it is not JSON', async () => {
    await expect(readJson(post('not json'), 100)).rejects.toMatchObject({ status: 400 });
  });
});

describe('errors', () => {
  it('say what an HttpError chose to say, with its status', async () => {
    const answer = await guard(async () => {
      throw new HttpError(403, 'Not allowed');
    });
    expect(answer.status).toBe(403);
    expect(await answer.json()).toEqual({ error: 'Not allowed' });
  });

  it('name nothing otherwise: no message, no stack, and the log has only the kind', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const answer = await guard(async () => {
      throw new Error('secret token abc123 failed');
    });
    expect(answer.status).toBe(500);
    expect(await answer.text()).not.toContain('abc123');
    expect(log).toHaveBeenCalledWith('unhandled', 'Error');
    log.mockRestore();
  });

  it('are JSON with the same safe headers', async () => {
    const answer = json({ error: 'x' }, 400);
    expect(answer.headers.get('Content-Type')).toContain('application/json');
    expect(answer.headers.get('Cache-Control')).toBe('no-store');
  });
});
