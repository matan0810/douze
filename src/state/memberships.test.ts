import { describe, expect, it } from 'vitest';
import { parseMemberships } from './memberships';

const group = 'A'.repeat(22);
const token = 'b'.repeat(43);
const good = { group, token, groupName: 'The friends', myName: 'Matan' };

describe('the groups saved on this device', () => {
  it('reads a saved membership, with or without an invite', () => {
    expect(parseMemberships([good])).toEqual([good]);
    expect(parseMemberships([{ ...good, invite: 'c'.repeat(43) }])).toEqual([
      { ...good, invite: 'c'.repeat(43) },
    ]);
  });

  it('drops a bad invite but keeps the membership', () => {
    expect(parseMemberships([{ ...good, invite: 'short' }])).toEqual([good]);
  });

  it('skips entries that are not memberships', () => {
    const bad = [
      null,
      'text',
      { ...good, group: 'short' },
      { ...good, token: 'x' },
      { ...good, groupName: '' },
      { ...good, myName: 'x'.repeat(200) },
    ];
    expect(parseMemberships([...bad, good])).toEqual([good]);
  });

  it('is empty for anything but a list, and keeps at most twenty', () => {
    expect(parseMemberships({ group })).toEqual([]);
    expect(parseMemberships(Array.from({ length: 30 }, () => good))).toHaveLength(20);
  });
});
