import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import {
  addPlayer,
  DEFAULT_OPTIONS,
  setDate,
  setJoker,
  setOptions,
  setRunningOrder,
  setSemiCountries,
  setSemiCount,
  setSemiPick,
  setSemiQualifiers,
  removePlayer,
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
      ...emptyGame(2027),
      finalists: ['israel', 'italy'],
      players: [{ id: 'p1', name: { he: 'דנה', en: 'דנה' }, order: ['italy'] }],
    });
  });

  it('keeps the options, the date, the running order and jokers that fit', () => {
    const stored = {
      year: 2027,
      finalists: ['israel', 'italy'],
      result: null,
      players: [
        { id: 'p1', name: { he: 'א', en: 'א' }, order: [], joker: 'italy' },
        { id: 'p2', name: { he: 'ב', en: 'ב' }, order: [], joker: 'atlantis' },
      ],
      date: '2027-05-15',
      runningOrder: ['italy', 'atlantis', 'israel'],
      options: { season: false, joker: true },
    };
    const game = parseStoredGame(stored, 2027, known);
    expect(game?.players.map((p) => p.joker)).toEqual(['italy', undefined]);
    expect(game?.date).toBe('2027-05-15');
    expect(game?.runningOrder).toEqual(['italy', 'israel']);
    expect(game?.options).toEqual({ season: false, joker: true });
    const bad = parseStoredGame(
      { ...stored, date: '15/5', options: { joker: 'yes' } },
      2027,
      known,
    );
    expect(bad?.date).toBeNull();
    expect(bad?.options).toEqual(DEFAULT_OPTIONS);
  });

  it.each([null, 'x', { year: 2026 }, { year: 2027, finalists: [], players: [], result: null }])(
    'refuses %j for 2026',
    (value) => {
      expect(parseStoredGame(value, 2026, known)).toBeUndefined();
    },
  );
});

describe('the semis of a game', () => {
  const base = setSemiCount({ ...emptyGame(2027), players: [] }, 2);
  const withField = setSemiCountries(setSemiCountries(base, 0, ['israel', 'italy', 'france']), 1, [
    'spain',
    'malta',
  ]);

  it('number none, one or two', () => {
    expect(setSemiCount(base, 5).semis).toHaveLength(2);
    expect(setSemiCount(base, 1).semis).toHaveLength(1);
    expect(setSemiCount(base, -1).semis).toHaveLength(0);
  });

  it('hold a country in one semi only: moving it takes it out of the other', () => {
    const moved = setSemiCountries(withField, 1, ['spain', 'malta', 'israel']);
    expect(moved.semis[0]?.countries).toEqual(['italy', 'france']);
    expect(moved.semis[1]?.countries).toEqual(['spain', 'malta', 'israel']);
  });

  it('keep a pick within the field, the reserve apart, no more than the count', () => {
    const game = setSemiPick(
      withField,
      0,
      'p1',
      ['israel', 'italy', 'france', 'atlantis'],
      'france',
    );
    expect(game.semis[0]?.predictions).toEqual([
      { player: 'p1', picks: ['israel', 'italy'], reserve: 'france' },
    ]);
  });

  it('take only a complete result, and drop it when the field changes under it', () => {
    let game = setSemiQualifiers(withField, 0, ['israel']);
    expect(game.semis[0]?.qualifiers).toBeNull();
    game = setSemiQualifiers(withField, 0, ['israel', 'italy']);
    expect(game.semis[0]?.qualifiers).toEqual(['israel', 'italy']);
    game = setSemiCountries(game, 0, ['israel', 'italy', 'france', 'malta']);
    expect(game.semis[0]?.qualifiers).toBeNull();
  });

  it("forget a removed player's picks", () => {
    const game = setSemiPick(withField, 0, 'p1', ['israel'], null);
    expect(removePlayer(game, 'p1').semis[0]?.predictions).toEqual([]);
  });

  it('are read back from the device, and what does not fit is dropped', () => {
    const stored = {
      ...JSON.parse(JSON.stringify(game2026())),
      semis: [
        {
          countries: ['israel', 'atlantis', 'italy'],
          qualifiers: ['israel'],
          predictions: [
            { player: 'adi', picks: ['israel', 'italy', 'atlantis'], reserve: 'italy' },
            { player: 'nobody', picks: ['israel'], reserve: null },
          ],
        },
        { countries: ['israel', 'france'], qualifiers: null, predictions: [] },
        { countries: ['spain'], qualifiers: null, predictions: [] },
      ],
    };
    expect(parseStoredGame(stored, 2026, known)?.semis).toEqual([
      {
        countries: ['israel', 'italy'],
        qualifiers: ['israel'],
        predictions: [{ player: 'adi', picks: ['israel'], reserve: 'italy' }],
      },
      { countries: ['france'], qualifiers: null, predictions: [] },
    ]);
  });
});

describe('the options of a year', () => {
  const game = setFinalists({ ...emptyGame(2027) }, ['israel', 'italy', 'france']);
  const withPlayer = addPlayer(game, 'דנה', ['israel', 'italy', 'france'], 'p1');

  it('a joker is a finalist, and leaves with it', () => {
    expect(setJoker(withPlayer, 'p1', 'italy').players[0]?.joker).toBe('italy');
    expect(setJoker(withPlayer, 'p1', 'spain').players[0]?.joker).toBeUndefined();
    const narrowed = setFinalists(setJoker(withPlayer, 'p1', 'italy'), ['israel', 'france']);
    expect(narrowed.players[0]?.joker).toBeUndefined();
  });

  it('a date is YYYY-MM-DD or nothing', () => {
    expect(setDate(game, '2027-05-15').date).toBe('2027-05-15');
    expect(setDate(game, 'soon').date).toBeNull();
  });

  it('the running order keeps only finalists', () => {
    expect(setRunningOrder(game, ['france', 'spain', 'israel']).runningOrder).toEqual([
      'france',
      'israel',
    ]);
  });

  it('options change one at a time', () => {
    expect(setOptions(game, { joker: true }).options).toEqual({ season: true, joker: true });
  });
});
