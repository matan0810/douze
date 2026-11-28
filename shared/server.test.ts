import { describe, expect, it } from 'vitest';
import { ACTIONS, CAPABILITIES, can, ROLES, type Action, type Role } from './capabilities';
import { LIMITS } from './config';
import { cleanName } from './names';
import { DEFAULT_LIMITS, limits } from './limits';
import { constantTimeEqual, hashToken, newToken, tokenMatches } from './tokens';

describe('the limits', () => {
  it("are the standard's defaults (SERVER.md), with Douze's names capped at 30", () => {
    expect(DEFAULT_LIMITS).toMatchObject({
      bodyBytes: 32768,
      nameMax: 40,
      membersPerGroup: 40,
      signInsPerHour: 30,
      groupsPerAccount: 10,
      groupsPerAddressPerDay: 5,
      groupsTotal: 2000,
      writesPerMinute: 60,
      joinsPerHour: 10,
      liveConnectionsPerGroup: 50,
      auditEntries: 1000,
      auditDays: 365,
    });
    expect(LIMITS.nameMax).toBe(30);
    expect(LIMITS.membersPerGroup).toBe(40);
  });

  it('refuse a number that is not a whole number of at least 1, or a name range turned over', () => {
    expect(() => limits({ groupsTotal: 0 })).toThrow();
    expect(() => limits({ writesPerMinute: 1.5 })).toThrow();
    expect(() => limits({ nameMin: 50, nameMax: 10 })).toThrow();
    expect(Object.isFrozen(limits())).toBe(true);
  });
});

describe('who may do what', () => {
  /** Written out in full on purpose: a change to the table must be a change to this too. */
  const expected: Record<Action, Role[]> = {
    'group.read': ['owner', 'admin', 'member'],
    'entry.write': ['owner', 'admin', 'member'],
    'settings.write': ['owner', 'admin'],
    'results.write': ['owner', 'admin'],
    'live.drive': ['owner', 'admin'],
    'member.release': ['owner', 'admin'],
    'member.approve': ['owner', 'admin'],
    'audit.read': ['owner', 'admin'],
    'admin.manage': ['owner'],
    'invite.rotate': ['owner'],
    'group.handover': ['owner'],
    'group.export': ['owner'],
    'group.delete': ['owner'],
  };

  it('allows and refuses every role for every action, as written', () => {
    for (const action of ACTIONS)
      for (const role of ROLES)
        expect(can(role, action), `${role} ${action}`).toBe(expected[action].includes(role));
  });

  it('puts the owner above the admin above the member', () => {
    for (const action of ACTIONS) {
      if (can('member', action)) expect(can('admin', action)).toBe(true);
      if (can('admin', action)) expect(can('owner', action)).toBe(true);
    }
    expect(Object.keys(CAPABILITIES).sort()).toEqual([...ACTIONS].sort());
  });

  it('denies by default: no role, an unknown role, an unknown action', () => {
    expect(can(null, 'group.read')).toBe(false);
    expect(can(undefined, 'group.read')).toBe(false);
    expect(can('superuser', 'group.read')).toBe(false);
    expect(can('owner', 'group.destroy-everything')).toBe(false);
  });
});

describe('secrets', () => {
  it('are random, 256 bits, URL-safe, and never repeat', () => {
    const tokens = Array.from({ length: 50 }, newToken);
    expect(new Set(tokens).size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('are stored as SHA-256 hashes (the known hash of "abc")', async () => {
    expect(await hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('match their own hash and nothing else', async () => {
    const token = newToken();
    const stored = await hashToken(token);
    expect(await tokenMatches(token, stored)).toBe(true);
    expect(await tokenMatches(newToken(), stored)).toBe(false);
    expect(await tokenMatches(token, stored.slice(1))).toBe(false);
  });

  it('are compared in full, whatever the lengths', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('names', () => {
  it('lose control and direction marks, extra spaces and anything past the cap', () => {
    expect(cleanName('  דנה ‮  כהן\u0000 ', 30)).toBe('דנה כהן');
    expect(cleanName('abcdef', 3)).toBe('abc');
  });
});
