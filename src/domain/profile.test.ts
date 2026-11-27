import { describe, expect, it } from 'vitest';
import { BIG_FIVE, calls, HOME, profiles, twins } from './profile';
import { game2026 } from './testGame';

describe('what the 2026 predictions say', () => {
  const byPlayer = new Map(profiles(game2026()).map((p) => [p.player, p]));

  it('top ten: Matan had 9 of the real ten, Adi and Ori 8', () => {
    expect([...byPlayer.values()].map((p) => [p.player, p.topTen])).toEqual([
      ['matan', 9],
      ['adi', 8],
      ['ori', 8],
    ]);
  });

  it('the biggest miss: Lithuania for Adi and Ori, Austria for Matan', () => {
    expect(byPlayer.get('adi')?.miss).toEqual({ country: 'lithuania', predicted: 6, actual: 22 });
    expect(byPlayer.get('ori')?.miss).toEqual({ country: 'lithuania', predicted: 12, actual: 22 });
    expect(byPlayer.get('matan')?.miss).toEqual({ country: 'austria', predicted: 14, actual: 24 });
  });

  it('the bold call: Matan put Germany 23rd, far below us, and it finished 23rd', () => {
    expect(byPlayer.get('matan')?.bold).toMatchObject({
      country: 'germany',
      predicted: 23,
      actual: 23,
    });
    expect(byPlayer.get('matan')?.bold?.average).toBeCloseTo(18.33, 1);
    expect(byPlayer.get('ori')?.bold?.country).toBe('austria');
  });

  it('top against bottom: Matan best at the top, Ori better at the bottom', () => {
    const matan = byPlayer.get('matan')?.halves;
    const ori = byPlayer.get('ori')?.halves;
    expect(matan?.top).toBe(3.25);
    expect(ori?.top).toBeCloseTo(5, 1);
    expect(ori?.bottom).toBeCloseTo(4.31, 1);
  });

  it('taste twins: Adi and Ori most alike, Ori and Matan least', () => {
    const pairs = twins(game2026());
    expect([pairs[0]?.a, pairs[0]?.b]).toEqual(['adi', 'ori']);
    expect(pairs[0]?.apart).toBeCloseTo(2.64, 2);
    expect([pairs.at(-1)?.a, pairs.at(-1)?.b]).toEqual(['ori', 'matan']);
  });

  it('home: Israel finished 2nd; Adi and Matan put it 5th, Ori 7th', () => {
    expect(calls(game2026(), [HOME])).toEqual([
      {
        country: 'israel',
        actual: 2,
        predicted: [
          { player: 'adi', place: 5 },
          { player: 'ori', place: 7 },
          { player: 'matan', place: 5 },
        ],
      },
    ]);
  });

  it('2026 knows its host: Austria, 24th', () => {
    const game = game2026();
    expect(game.hostCountry).toBe('austria');
    expect(calls(game, ['austria'])[0]?.actual).toBe(24);
  });

  it('the big five in the final: all of us put the UK last, and it was', () => {
    const big = calls(game2026(), BIG_FIVE);
    expect(big.map((c) => c.country)).toEqual(['france', 'germany', 'italy', 'united-kingdom']);
    const uk = big.find((c) => c.country === 'united-kingdom');
    expect(uk?.actual).toBe(25);
    expect(uk?.predicted.every((p) => p.place === 25)).toBe(true);
  });
});
