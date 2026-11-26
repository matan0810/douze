import { describe, expect, it } from 'vitest';
import { careers, consensus, countryGrid, headToHead, insights } from './stats';
import { game2026 } from './testGame';

describe('what the 2026 final taught us', () => {
  const game = game2026();
  const found = insights(game);
  if (!found) throw new Error('no insights');

  it('finds the surprise and the letdown against our average prediction', () => {
    expect(found.surprise.country).toBe('poland');
    expect(found.surprise.actual).toBe(12);
    expect(found.surprise.average).toBeCloseTo(19.33, 2);
    expect(found.letdown.country).toBe('lithuania');
    expect(found.letdown.actual).toBe(22);
  });

  it('scores our average prediction at 149, second in the table', () => {
    expect(found.crowd).toEqual({ total: 149, rank: 2 });
  });

  it('names who placed the winner closest', () => {
    expect(found.prophets).toEqual({ players: ['matan'], predicted: 6 });
  });

  it('finds where we agreed and where we split', () => {
    expect(found.agreed).toEqual({ country: 'italy', spread: 0 });
    expect(found.split).toEqual({ country: 'albania', spread: 13 });
  });

  it('puts Bulgaria at 7.33 on average', () => {
    expect(consensus(game).average.get('bulgaria')).toBeCloseTo(7.33, 2);
  });

  it('lays out every country with each prediction', () => {
    const grid = countryGrid(game);
    expect(grid).toHaveLength(25);
    expect(grid[0]).toMatchObject({ country: 'bulgaria', actual: 1, predicted: [7, 9, 6] });
  });

  it('counts who was closer, pair by pair, in table order', () => {
    expect(headToHead(game)).toEqual([
      { a: 'matan', b: 'adi', aCloser: 9, bCloser: 8, even: 8 },
      { a: 'matan', b: 'ori', aCloser: 13, bCloser: 7, even: 5 },
      { a: 'adi', b: 'ori', aCloser: 10, bCloser: 10, even: 5 },
    ]);
  });

  it('has nothing to teach before the result', () => {
    expect(insights({ ...game, result: null })).toBeUndefined();
    expect(headToHead({ ...game, result: null })).toEqual([]);
  });
});

describe('careers across the years', () => {
  it('counts titles, podiums, points and the best final', () => {
    const game = game2026();
    const [first] = careers([game]);
    expect(first).toMatchObject({ key: 'matan', finals: 1, titles: 1, podiums: 1, points: 158 });
    expect(first?.best.year).toBe(2026);
  });

  it('joins the same person across years by id, and device players by name', () => {
    const game = game2026();
    const result = game.result ?? [];
    const later = {
      ...game,
      year: 2027,
      players: game.players.map((p) => (p.id === 'ori' ? { ...p, order: [...result] } : p)),
    };
    const local = {
      ...game,
      year: 2028,
      players: [{ id: 'p1', name: { he: 'דנה', en: 'דנה' }, order: [...result] }],
    };
    const local2 = {
      ...local,
      year: 2029,
      players: [{ id: 'p2', name: { he: 'דנה', en: 'דנה' }, order: [...result] }],
    };
    const all = careers([game, later, local, local2]);
    expect(all.find((c) => c.key === 'ori')).toMatchObject({ finals: 2, titles: 1 });
    expect(all.find((c) => c.key === 'name:דנה')).toMatchObject({ finals: 2, titles: 2 });
  });
});
