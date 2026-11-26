import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import {
  basePoints,
  bonusPoints,
  isComplete,
  maxScore,
  scorePrediction,
  standings,
} from './scoring';

describe('the rule', () => {
  it('gives 10 for an exact place, one less per place off, never below zero', () => {
    expect([0, 1, 2, 9, 10, 11, 24].map(basePoints)).toEqual([10, 9, 8, 1, 0, 0, 0]);
  });

  it('adds 15, 10 and 5 for the exact winner, runner-up and third only', () => {
    expect(bonusPoints(1, 1)).toBe(15);
    expect(bonusPoints(2, 2)).toBe(10);
    expect(bonusPoints(3, 3)).toBe(5);
    expect(bonusPoints(4, 4)).toBe(0);
    expect(bonusPoints(2, 1)).toBe(0);
  });

  it('caps a final of 25 at 280, and a smaller one at what it can hold', () => {
    expect(maxScore(25)).toBe(280);
    expect(maxScore(2)).toBe(45);
    expect(maxScore(0)).toBe(0);
  });

  it('scores a perfect prediction at the maximum', () => {
    const result = ['a', 'b', 'c', 'd'];
    const score = scorePrediction('p', result, result);
    expect(score.total).toBe(maxScore(4));
    expect(score.share).toBe(1);
    expect(score.exact).toBe(4);
  });

  it('scores a reversed prediction', () => {
    // a: 3 off → 7, b: 1 off → 9, c: 1 off → 9, d: 3 off → 7
    expect(scorePrediction('p', ['d', 'c', 'b', 'a'], ['a', 'b', 'c', 'd']).total).toBe(32);
  });
});

describe('a complete prediction', () => {
  const finalists = ['a', 'b', 'c'];
  it('has every finalist once and nothing else', () => {
    expect(isComplete(['c', 'a', 'b'], finalists)).toBe(true);
    expect(isComplete(['c', 'a'], finalists)).toBe(false);
    expect(isComplete(['c', 'a', 'a'], finalists)).toBe(false);
    expect(isComplete(['c', 'a', 'x'], finalists)).toBe(false);
  });
});

describe('standings', () => {
  it('ranks by points, then exact places, then within one, and shares a full tie', () => {
    const result = ['a', 'b', 'c'];
    const table = standings(
      [
        { player: 'worst', order: ['c', 'b', 'a'] },
        { player: 'best', order: ['a', 'b', 'c'] },
        { player: 'twin', order: ['c', 'b', 'a'] },
        { player: 'partial', order: ['a'] },
      ],
      result,
      result,
    );
    expect(table.map((s) => [s.player, s.rank])).toEqual([
      ['best', 1],
      ['worst', 2],
      ['twin', 2],
    ]);
  });
});

describe('the 2026 final, from the real data', () => {
  const edition = archive.editions.find((e) => e.year === 2026);
  if (!edition?.result) throw new Error('2026 has no result');
  const table = standings(edition.predictions, edition.result, edition.finalists);

  it('has 25 finalists and a maximum of 280', () => {
    expect(edition.finalists).toHaveLength(25);
    expect(table[0]?.max).toBe(280);
  });

  it('puts Matan first with 158, then Adi 145 and Ori 139', () => {
    expect(table.map((s) => [s.player, s.total, s.rank])).toEqual([
      ['matan', 158, 1],
      ['adi', 145, 2],
      ['ori', 139, 3],
    ]);
  });

  it('counts exact places and places within one', () => {
    expect(table.map((s) => [s.exact, s.close])).toEqual([
      [2, 6],
      [2, 4],
      [3, 4],
    ]);
  });
});
