import { describe, expect, it } from 'vitest';
import * as entry from './index';

describe('the Worker entry', () => {
  it('exports only the handler: Cloudflare treats any other named export as an entry point', () => {
    expect(Object.keys(entry)).toEqual(['default']);
    expect(typeof entry.default.fetch).toBe('function');
  });
});
