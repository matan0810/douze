import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import { gameFromEdition } from './game';
import {
  careers,
  consensus,
  countryGrid,
  gameStandings,
  headToHead,
  insights,
  rivalries,
} from './stats';
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

describe('rivalries and surprises', () => {
  it('2026: Matan above Adi and Ori, Adi above Ori, one final each', () => {
    const pairs = rivalries([game2026()]).map((r) => [r.a.key, r.aWins, r.bWins, r.b.key]);
    expect(pairs).toEqual(
      expect.arrayContaining([
        ['matan', 1, 0, 'adi'],
        ['matan', 1, 0, 'ori'],
        ['adi', 1, 0, 'ori'],
      ]),
    );
    expect(pairs).toHaveLength(3);
  });

  it('adds the finals up, the same person joined by id', () => {
    const r = rivalries([game2026(), { ...game2026(), year: 2027 }]);
    expect(r.find((x) => x.a.key === 'matan' && x.b.key === 'adi')?.aWins).toBe(2);
  });

  it('every country has its surprise and who was closest: Israel beat our 5.7 by far', () => {
    const israel = countryGrid(game2026()).find((row) => row.country === 'israel');
    expect(israel?.surprise).toBeCloseTo(3.67, 1);
    expect(israel?.closest).toEqual(['adi', 'matan']);
  });
});

describe('the earlier finals, against their real results', () => {
  const table = (year: number) => {
    const edition = archive.editions.find((e) => e.year === year);
    if (!edition) throw new Error(`no ${year} in the archive`);
    return gameStandings(gameFromEdition(edition, archive.players)).map((s) => [s.player, s.total]);
  };

  it('2024: Ori 174, Adi 149, Matan 128', () => {
    expect(table(2024)).toEqual([
      ['ori', 174],
      ['adi', 149],
      ['matan', 128],
    ]);
  });

  it('2025: Ori 149, Matan 143', () => {
    expect(table(2025)).toEqual([
      ['ori', 149],
      ['matan', 143],
    ]);
  });

  it('count the titles across the years: Ori 2, Matan 1', () => {
    const games = archive.editions.map((e) => gameFromEdition(e, archive.players));
    const titles = Object.fromEntries(careers(games).map((c) => [c.key, c.titles]));
    expect(titles).toEqual({ ori: 2, matan: 1, adi: 0 });
  });
});
