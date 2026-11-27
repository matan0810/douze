import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import { gameFromEdition } from './game';
import { season2026 } from './testSeason';
import { isCompletePick, qualifierCount, scoreSemiPick, semiStandings } from './semis';
import { seasonStandings } from './season';

describe('the rule of a semi', () => {
  it('gives 2 for each qualifier named, and 1 for a reserve that qualified', () => {
    const score = scoreSemiPick({ player: 'p', picks: ['a', 'b', 'c'], reserve: 'd' }, [
      'a',
      'd',
      'x',
    ]);
    expect(score).toMatchObject({ hits: 1, reserveHit: true, points: 3, perfect: false });
  });

  it('is perfect when every pick qualified, and then the reserve cannot have', () => {
    const score = scoreSemiPick({ player: 'p', picks: ['a', 'b'], reserve: 'c' }, ['a', 'b']);
    expect(score).toMatchObject({ points: 4, perfect: true, reserveHit: false });
  });

  it('sends ten from a semi, fewer from a field of ten or less', () => {
    expect(qualifierCount(Array.from({ length: 15 }, (_, i) => `c${i}`))).toBe(10);
    expect(qualifierCount(['a', 'b', 'c'])).toBe(2);
  });

  it('needs the full ten, all distinct and in the semi, and a reserve apart from them', () => {
    const semi = { countries: ['a', 'b', 'c'] };
    expect(isCompletePick({ picks: ['a', 'b'], reserve: 'c' }, semi)).toBe(true);
    expect(isCompletePick({ picks: ['a'], reserve: 'c' }, semi)).toBe(false);
    expect(isCompletePick({ picks: ['a', 'b'], reserve: null }, semi)).toBe(false);
    expect(isCompletePick({ picks: ['a', 'b'], reserve: 'a' }, semi)).toBe(false);
    expect(isCompletePick({ picks: ['a', 'z'], reserve: 'c' }, semi)).toBe(false);
  });
});

describe('the 2026 semi-finals, from the real data', () => {
  const edition = archive.editions.find((e) => e.year === 2026);
  const [first, second] = edition?.semis ?? [];
  if (!first || !second) throw new Error('2026 has no semis');

  it('sent ten each; with the host and the big five, that is the final of 25', () => {
    const fromSemis = new Set([...(first.qualifiers ?? []), ...(second.qualifiers ?? [])]);
    expect(fromSemis.size).toBe(20);
    const direct = edition?.finalists.filter((id) => !fromSemis.has(id)).sort();
    expect(direct).toEqual(['austria', 'france', 'germany', 'italy', 'united-kingdom']);
  });

  it('scores semi 1: Ori 18 (9 of 10), Adi 15 (7, and Poland her reserve)', () => {
    expect(semiStandings(first).map((s) => [s.player, s.points, s.rank])).toEqual([
      ['ori', 18, 1],
      ['adi', 15, 2],
    ]);
  });

  it('scores semi 2: Ori and Matan level on 17 (8 of 10, and their reserves qualified)', () => {
    expect(semiStandings(second).map((s) => [s.player, s.points, s.rank])).toEqual([
      ['ori', 17, 1],
      ['matan', 17, 1],
    ]);
  });

  it('adds up the season: Matan 175, Ori 174, Adi 160; nobody perfect', () => {
    expect(seasonStandings(season2026()).map((r) => [r.player, r.total, r.bonus, r.rank])).toEqual([
      ['matan', 175, 0, 1],
      ['ori', 174, 0, 2],
      ['adi', 160, 0, 3],
    ]);
  });

  it('gives the perfect bonus in the season only', () => {
    const game = season2026();
    const semi = game.semis[0];
    if (!semi?.qualifiers) throw new Error('no result');
    const perfect = { player: 'adi', picks: [...semi.qualifiers], reserve: 'portugal' };
    const changed = {
      ...game,
      semis: [{ ...semi, predictions: [perfect] }, ...game.semis.slice(1)],
    };
    expect(semiStandings(changed.semis[0] ?? semi)[0]?.points).toBe(20);
    expect(seasonStandings(changed).find((r) => r.player === 'adi')).toMatchObject({
      bonus: 5,
      total: 145 + 20 + 5,
    });
  });
});

describe('the earlier years in the archive', () => {
  const edition = (year: number) => {
    const found = archive.editions.find((e) => e.year === year);
    if (!found) throw new Error(`no ${year} in the archive`);
    return found;
  };
  const scores = (year: number, semi: number) =>
    Object.fromEntries(
      semiStandings(gameFromEdition(edition(year), archive.players).semis[semi] ?? emptySemi).map(
        (s) => [s.player, s.points],
      ),
    );
  const emptySemi = { countries: [], qualifiers: null, predictions: [] };

  it('know the fields of the finals: 25 in 2024 (the Netherlands was disqualified), 26 in 2025', () => {
    expect(edition(2024).finalists).toHaveLength(25);
    expect(edition(2025).finalists).toHaveLength(26);
    expect(
      edition(2024)
        .predictions.map((p) => p.player)
        .sort(),
    ).toEqual(['adi', 'matan', 'ori']);
    expect(
      edition(2025)
        .predictions.map((p) => p.player)
        .sort(),
    ).toEqual(['matan', 'ori']);
  });

  it('score 2024 semi 1 for Matan: 9 of his 10 went through, and his 11th, Serbia, too', () => {
    expect(scores(2024, 0)).toEqual({ matan: 19 });
  });

  it('score 2025: semi 1 Ori and Matan level on 15, semi 2 Ori 15', () => {
    expect(scores(2025, 0)).toEqual({ ori: 15, matan: 15 });
    expect(scores(2025, 1)).toEqual({ ori: 15 });
  });

  it('keep the semis out of the season: not everyone played every stage', () => {
    expect(edition(2024).season).toBe(false);
    expect(edition(2025).season).toBe(false);
  });
});
