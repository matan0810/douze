import { describe, expect, it } from 'vitest';
import { revealSteps } from './reveal';
import { gameStandings } from './stats';
import { game2026 } from './testGame';

describe('the reveal ceremony', () => {
  it('reveals 2026 from the last place: Ori, then Adi, then Matan', () => {
    const steps = revealSteps(gameStandings(game2026()));
    expect(steps.map((step) => step.map((s) => s.player))).toEqual([['ori'], ['adi'], ['matan']]);
  });

  it('reveals players level on a place together', () => {
    const steps = revealSteps([
      { player: 'a', rank: 1 },
      { player: 'b', rank: 1 },
      { player: 'c', rank: 3 },
    ]);
    expect(steps.map((step) => step.map((s) => s.player))).toEqual([['c'], ['a', 'b']]);
  });
});
