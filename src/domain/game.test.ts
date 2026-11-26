import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import {
  addPlayer,
  cleanName,
  differs,
  emptyGame,
  MAX_NAME,
  parseStoredGame,
  setFinalists,
  setOrder,
  setResult,
} from './game';
import { game2026 } from './testGame';

const known = new Set(archive.countries.map((c) => c.id));

describe('names', () => {
  it('are trimmed, collapsed, stripped of direction marks and capped', () => {
    expect(cleanName('  דנה \n  כהן ')).toBe('דנה כהן');
    expect(cleanName('a‮exe.txt')).toBe('aexe.txt');
    expect(cleanName('x'.repeat(99))).toHaveLength(MAX_NAME);
  });
});

describe('editing a game', () => {
  it('adds a player, refusing an empty name', () => {
    const game = emptyGame(2027);
    expect(addPlayer(game, '   ')).toBe(game);
    expect(addPlayer(game, 'דנה').players[0]?.name).toEqual({ he: 'דנה', en: 'דנה' });
  });

  it('keeps an order within the field, each country once', () => {
    const game = addPlayer({ ...emptyGame(2027), finalists: ['israel', 'italy'] }, 'דנה');
    const id = game.players[0]?.id ?? '';
    expect(setOrder(game, id, ['italy', 'france', 'italy', 'israel']).players[0]?.order).toEqual([
      'italy',
      'israel',
    ]);
  });

  it('drops a country from every prediction and the result when it leaves the field', () => {
    const game = setFinalists(
      game2026(),
      game2026().finalists.filter((id) => id !== 'israel'),
    );
    expect(game.players.every((p) => !p.order.includes('israel'))).toBe(true);
    expect(game.result).toBeNull();
  });

  it('takes only a complete result', () => {
    const game = game2026();
    expect(setResult(game, ['israel']).result).toBeNull();
  });

  it('knows when the device differs from the archive', () => {
    expect(differs(game2026(), game2026())).toBe(false);
    expect(differs(setResult(game2026(), null), game2026())).toBe(true);
  });
});

describe('a game saved on the device', () => {
  it('reads back what was saved', () => {
    const game = game2026();
    expect(parseStoredGame(JSON.parse(JSON.stringify(game)), 2026, known)).toEqual(game);
  });

  it('drops unknown countries, repeats, broken players and a result no longer complete', () => {
    const stored = {
      year: 2027,
      finalists: ['israel', 'atlantis', 'italy', 'israel'],
      result: ['israel', 'atlantis'],
      players: [
        { id: 'p1', name: { he: 'דנה', en: 'דנה' }, order: ['italy', 'atlantis'] },
        { id: 'p1', name: { he: 'שוב', en: 'שוב' }, order: [] },
        { id: 'p2', name: 'not bilingual', order: [] },
        { id: 'p3', name: { he: '', en: '' }, order: [] },
      ],
    };
    expect(parseStoredGame(stored, 2027, known)).toEqual({
      year: 2027,
      finalists: ['israel', 'italy'],
      result: null,
      players: [{ id: 'p1', name: { he: 'דנה', en: 'דנה' }, order: ['italy'] }],
    });
  });

  it.each([null, 'x', { year: 2026 }, { year: 2027, finalists: [], players: [], result: null }])(
    'refuses %j for 2026',
    (value) => {
      expect(parseStoredGame(value, 2026, known)).toBeUndefined();
    },
  );
});
