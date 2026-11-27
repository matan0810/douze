import { describe, expect, it } from 'vitest';
import {
  isCompleteEntry,
  parseEntry,
  parseStageSetup,
  parseYears,
  parseYearView,
  qualifierCount,
} from './years';

const field = ['albania', 'armenia', 'australia', 'austria'];
const lockAt = Date.UTC(2027, 4, 15, 19);

describe("a stage's setup", () => {
  it('takes catalogue countries, a lock and a joker for the final', () => {
    expect(parseStageSetup('final', { countries: field, lockAt, joker: true })).toEqual({
      countries: field,
      lockAt,
      joker: true,
    });
  });

  it('refuses a joker in a semi, unknown or repeated countries, a bad lock, extra fields', () => {
    const bad: [Parameters<typeof parseStageSetup>[0], unknown][] = [
      ['semi-1', { countries: field, lockAt, joker: true }],
      ['final', { countries: ['albania', 'atlantis'], lockAt, joker: false }],
      ['final', { countries: ['albania', 'albania'], lockAt, joker: false }],
      ['final', { countries: ['albania'], lockAt, joker: false }],
      ['final', { countries: field, lockAt: 5, joker: false }],
      ['final', { countries: field, lockAt: lockAt + 0.5, joker: false }],
      ['final', { countries: field, lockAt, joker: false, extra: 1 }],
    ];
    for (const [stage, value] of bad) expect(parseStageSetup(stage, value)).toBeUndefined();
  });
});

describe('a prediction', () => {
  const final = { countries: field, joker: true };

  it('of the final: an order within the field, in progress or complete, and a joker', () => {
    const partial = parseEntry('final', { order: ['austria'], joker: null }, final);
    expect(partial).toEqual({ order: ['austria'], joker: null });
    expect(partial && isCompleteEntry(partial, field)).toBe(false);
    const full = parseEntry('final', { order: field, joker: 'armenia' }, final);
    expect(full && isCompleteEntry(full, field)).toBe(true);
  });

  it('of the final: refuses countries outside the field, and a joker when there are none', () => {
    expect(parseEntry('final', { order: ['sweden'], joker: null }, final)).toBeUndefined();
    expect(
      parseEntry('final', { order: field, joker: 'armenia' }, { countries: field, joker: false }),
    ).toBeUndefined();
  });

  it('of a semi: picks up to the qualifiers, and a reserve apart from them', () => {
    const semi = { countries: field, joker: false };
    expect(qualifierCount(field)).toBe(3);
    const pick = parseEntry('semi-1', { picks: field.slice(0, 3), reserve: 'austria' }, semi);
    expect(pick && isCompleteEntry(pick, field)).toBe(true);
    expect(parseEntry('semi-1', { picks: field, reserve: null }, semi)).toBeUndefined();
    expect(parseEntry('semi-1', { picks: ['albania'], reserve: 'albania' }, semi)).toBeUndefined();
  });
});

describe('what the server answers', () => {
  const member = 'A'.repeat(22);

  it('reads a year with its stages and entries', () => {
    const view = {
      year: 2027,
      now: lockAt - 1000,
      stages: [
        {
          stage: 'final',
          countries: field,
          lockAt,
          joker: false,
          locked: false,
          done: [member],
          entries: [{ member, entry: { order: field, joker: null } }],
        },
      ],
    };
    expect(parseYearView(view)?.stages[0]?.entries).toHaveLength(1);
    expect(parseYearView({ ...view, stages: [view.stages[0], view.stages[0]] })).toBeUndefined();
    expect(parseYearView({ ...view, year: 1900 })).toBeUndefined();
  });

  it('reads the list of years', () => {
    expect(parseYears({ years: [2027, 2026] })).toEqual([2027, 2026]);
    expect(parseYears({ years: [2027, 'x'] })).toBeUndefined();
  });
});
