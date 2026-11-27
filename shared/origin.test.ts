import { describe, expect, it } from 'vitest';
import { serverOrigin } from './origin';

describe('the server address a build is given', () => {
  it('keeps the origin of an https address', () => {
    expect(serverOrigin('https://douze-api.example.workers.dev/some/path')).toBe(
      'https://douze-api.example.workers.dev',
    );
  });

  it('allows plain http only on this machine', () => {
    expect(serverOrigin('http://localhost:8788')).toBe('http://localhost:8788');
    expect(serverOrigin('http://127.0.0.1:8788')).toBe('http://127.0.0.1:8788');
    expect(serverOrigin('http://example.com')).toBeUndefined();
  });

  it('is no server for anything else', () => {
    for (const raw of [undefined, '', 'not a url', 'javascript:alert(1)', 'ftp://x.com', 42]) {
      expect(serverOrigin(raw)).toBeUndefined();
    }
  });
});
