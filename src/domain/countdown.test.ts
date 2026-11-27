import { describe, expect, it } from 'vitest';
import { daysBetween, nextFinal, today } from './countdown';
import { emptyGame, setDate } from './game';

describe('the countdown', () => {
  const games = [
    setDate(emptyGame(2026), '2026-05-16'),
    setDate(emptyGame(2027), '2027-05-15'),
    emptyGame(2028),
  ];

  it('counts whole days, across a change of clocks', () => {
    expect(daysBetween('2027-03-20', '2027-04-02')).toBe(13);
    expect(daysBetween('2027-05-15', '2027-05-15')).toBe(0);
    expect(daysBetween('2027-05-16', '2027-05-15')).toBe(-1);
  });

  it('finds the nearest final ahead, tonight included', () => {
    expect(nextFinal(games, '2026-11-27')).toEqual({ year: 2027, days: 169 });
    expect(nextFinal(games, '2027-05-15')).toEqual({ year: 2027, days: 0 });
    expect(nextFinal(games, '2027-05-16')).toBeUndefined();
  });

  it("knows today by the device's own calendar", () => {
    expect(today(new Date(2027, 0, 5, 23, 30))).toBe('2027-01-05');
  });
});
