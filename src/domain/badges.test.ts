import { describe, expect, it } from 'vitest';
import { badges, seasonBadges, semiBadges } from './badges';
import { setSemiPick } from './game';
import { seasonStandings } from './season';
import { semiStandings } from './semis';
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

describe('the stickers of the 2026 semis', () => {
  const game = game2026();
  const [one, two] = game.semis.map((semi) => semiBadges(semiStandings(semi)));

  it('crown Ori in semi 1, and give Adi her 11th: Poland went through', () => {
    expect(one?.get('ori')).toEqual([{ kind: 'champion' }]);
    expect(one?.get('adi')).toEqual([{ kind: 'reserve' }]);
  });

  it('crown both Ori and Matan in semi 2, level on 17, both with their 11th in', () => {
    expect(two?.get('ori')).toEqual([{ kind: 'champion' }, { kind: 'reserve' }]);
    expect(two?.get('matan')).toEqual([{ kind: 'champion' }, { kind: 'reserve' }]);
  });

  it('give a perfect semi its sticker, in the semi and in the season', () => {
    const perfect = setSemiPick(game, 0, 'matan', game.semis[0]?.qualifiers ?? [], 'estonia');
    const semi = perfect.semis[0];
    if (!semi) throw new Error('2026 has a first semi');
    const both = [{ kind: 'champion' }, { kind: 'perfect' }];
    expect(semiBadges(semiStandings(semi)).get('matan')).toEqual(both);
    expect(seasonBadges(seasonStandings(perfect)).get('matan')).toEqual(both);
  });
});
