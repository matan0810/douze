import { describe, expect, it } from 'vitest';
import { badges } from './badges';
import { game2026 } from './testGame';

describe('the stickers of the 2026 final', () => {
  const given = badges(game2026());

  it('crown Matan and name him the prophet (he put Bulgaria 6th, the highest)', () => {
    expect(given.get('matan')).toEqual([{ kind: 'champion' }, { kind: 'prophet', place: 6 }]);
  });

  it('give Adi "almost": 13 points behind', () => {
    expect(given.get('adi')).toEqual([{ kind: 'almost', gap: 13 }]);
  });

  it('give Ori the sharpshooter: 3 exact places, more than anyone', () => {
    expect(given.get('ori')).toEqual([{ kind: 'sharpshooter', exact: 3 }]);
  });

  it('give nothing before the result', () => {
    expect([...badges({ ...game2026(), result: null }).values()]).toEqual([]);
  });

  it('give at most two to anyone', () => {
    const game = game2026();
    const solo = { ...game, players: game.players.filter((p) => p.id === 'ori') };
    // alone, Ori is champion, sharpshooter and prophet: only the first two show
    expect(badges(solo).get('ori')).toEqual([
      { kind: 'champion' },
      { kind: 'sharpshooter', exact: 3 },
    ]);
  });
});
