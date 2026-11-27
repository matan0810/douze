import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import { addPlayer } from './game';
import { parsePlayers } from './parse';
import { PIECES, playerPieces } from './pieces';
import { game2026 } from './testGame';

describe('game pieces', () => {
  it('give the archive players the colours they name', () => {
    expect(Object.fromEntries(playerPieces(game2026(), archive.players))).toEqual({
      adi: 'cyan',
      ori: 'violet',
      matan: 'pink',
    });
  });

  it('give a player added on a device the first colour nobody has', () => {
    const game = addPlayer(game2026(), 'דנה', [], 'p1');
    expect(playerPieces(game, archive.players).get('p1')).toBe('gold');
  });

  it('come round again when there are more players than pieces', () => {
    let game = { ...game2026(), players: [] as ReturnType<typeof game2026>['players'] };
    for (let i = 0; i < PIECES.length + 2; i++) game = addPlayer(game, `x${i}`, [], `p${i}`);
    const pieces = playerPieces(game, []);
    expect(pieces.size).toBe(PIECES.length + 2);
    expect(new Set(pieces.values()).size).toBe(PIECES.length);
  });

  it('refuse a colour that is not a piece in players.json', () => {
    expect(() => parsePlayers([{ id: 'a', name: { he: 'א', en: 'A' }, piece: 'red' }])).toThrow(
      /piece/,
    );
  });
});
