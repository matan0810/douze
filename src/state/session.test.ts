import { describe, expect, it } from 'vitest';
import { parseSession } from '../../shared/accounts';

describe('the session saved on this device', () => {
  it('reads a token and a name', () => {
    const saved = { token: 'a'.repeat(43), name: 'מתן' };
    expect(parseSession(saved)).toEqual(saved);
  });

  it('refuses anything else: a short token, no name, an extra field, not an object', () => {
    for (const bad of [
      { token: 'short', name: 'x' },
      { token: 'a'.repeat(43) },
      { token: 'a'.repeat(43), name: 'x', extra: 1 },
      null,
      'text',
    ])
      expect(parseSession(bad)).toBeUndefined();
  });
});
