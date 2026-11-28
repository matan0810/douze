import { describe, expect, it } from 'vitest';
import { parseInvites } from './invites';

const group = 'A'.repeat(22);
const invite = 'b'.repeat(43);

describe('the invitation links saved on this device', () => {
  it('reads a saved link per group', () => {
    expect(parseInvites({ [group]: invite })).toEqual({ [group]: invite });
  });

  it('drops anything that is not a group id with an invitation secret', () => {
    expect(
      parseInvites({ short: invite, [group]: 'short', [`${'C'.repeat(22)}`]: invite }),
    ).toEqual({
      [`${'C'.repeat(22)}`]: invite,
    });
  });

  it('is empty for anything but an object, and keeps at most fifty', () => {
    for (const bad of [null, [], 'x', 5]) expect(parseInvites(bad)).toEqual({});
    const many = Object.fromEntries(
      Array.from({ length: 80 }, (_, i) => [String(i).padStart(22, 'x'), invite]),
    );
    expect(Object.keys(parseInvites(many))).toHaveLength(50);
  });
});
