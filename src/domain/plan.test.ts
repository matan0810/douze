import { describe, expect, it } from 'vitest';
import { emptyGame, setFinalists, setRunningOrder } from './game';
import { emptyPlan, nextSong, parsePlan, place, planOrder, planRanking, undo } from './plan';

describe('planning mode', () => {
  const game = setRunningOrder(setFinalists(emptyGame(2027), ['a', 'b', 'c', 'd']), ['c', 'a']);
  const order = planOrder(game);

  it('follows the running order, then the rest of the field', () => {
    expect(order).toEqual(['c', 'a', 'b', 'd']);
  });

  it('places each song in a drawer, at its place among the others there', () => {
    let plan = place(emptyPlan(), 'c', 'top', 0);
    expect(nextSong(plan, order)).toBe('a');
    plan = place(plan, 'a', 'top', 0); // above c
    plan = place(plan, 'b', 'bottom', 0);
    plan = place(plan, 'd', 'win', 5); // clamped to the end
    expect(nextSong(plan, order)).toBeUndefined();
    expect(planRanking(plan)).toEqual(['d', 'a', 'c', 'b']);
  });

  it('moves a song placed again, and takes back the last one', () => {
    let plan = place(place(emptyPlan(), 'c', 'top', 0), 'a', 'middle', 0);
    plan = place(plan, 'c', 'bottom', 0);
    expect(plan.drawers.top).toEqual([]);
    expect(planRanking(plan)).toEqual(['a', 'c']);
    plan = undo(plan);
    expect(planRanking(plan)).toEqual(['a']);
    expect(nextSong(plan, order)).toBe('c');
    expect(undo(emptyPlan())).toEqual(emptyPlan());
  });

  it('reads a saved plan, dropping what does not fit', () => {
    const saved = {
      drawers: { win: ['a', 'x'], top: ['a', 'b'], middle: 'no', bottom: [3] },
      placed: ['b', 'a', 'zz'],
    };
    expect(parsePlan(saved, ['a', 'b', 'c'])).toEqual({
      drawers: { win: ['a'], top: ['b'], middle: [], bottom: [] },
      placed: ['b', 'a'],
    });
    expect(parsePlan({ drawers: {} }, ['a'])).toBeUndefined();
    expect(parsePlan(null, ['a'])).toBeUndefined();
  });
});
