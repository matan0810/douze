import { describe, expect, it } from 'vitest';
import { addPlayer, emptyGame } from '../domain/game';
import { game2026 } from '../domain/testGame';
import { fromLegacy, GAME_PREFIX, loadGames, saveGame, type Store } from './games';

function memory(initial: Record<string, string> = {}): Store & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    keys: () => [...data.keys()],
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
}

describe('games on a device', () => {
  it('start as the archive', () => {
    expect(loadGames(memory()).get(2026)).toEqual(game2026());
  });

  it('keep what was changed, and forget it once it matches the archive again', () => {
    const store = memory();
    const changed = addPlayer(game2026(), 'דנה');
    saveGame(store, changed);
    expect(loadGames(store).get(2026)).toEqual(changed);
    saveGame(store, game2026());
    expect(store.data.size).toBe(0);
  });

  it('take the official result from the archive, whatever was saved', () => {
    const store = memory();
    const edited = { ...addPlayer(game2026(), 'דנה'), result: ['israel', 'italy'] };
    store.set(`${GAME_PREFIX}2026`, JSON.stringify(edited));
    const game = loadGames(store).get(2026);
    expect(game?.result).toEqual(game2026().result);
    expect(game?.players).toHaveLength(game2026().players.length + 1);
  });

  it('give a year the archive does not have no result', () => {
    const store = memory();
    store.set(
      `${GAME_PREFIX}2027`,
      JSON.stringify({
        ...emptyGame(2027),
        finalists: ['israel', 'italy'],
        result: ['israel', 'italy'],
      }),
    );
    expect(loadGames(store).get(2027)?.result).toBeNull();
  });

  it('add a final created here', () => {
    const store = memory();
    saveGame(store, { ...emptyGame(2027), finalists: ['israel', 'italy'] });
    expect(loadGames(store).get(2027)?.finalists).toEqual(['israel', 'italy']);
  });

  it('drop a broken save', () => {
    const store = memory({ [`${GAME_PREFIX}2026`]: '{oops', [`${GAME_PREFIX}abc`]: '1' });
    expect(loadGames(store).get(2026)).toEqual(game2026());
    expect(store.data.has(`${GAME_PREFIX}2026`)).toBe(false);
  });
});

describe('what the first site saved', () => {
  const legacy = {
    year: 2026,
    countries: game2026().finalists.map((id) => ({ id, name: id, flag: '', code: 'xx' })),
    players: [
      { id: 'player-1', name: 'מתן', prediction: game2026().players[2]?.order },
      { id: 'player-2', name: 'דנה', prediction: ['israel'] },
    ],
    results: { finalOrder: game2026().result, calculatedAt: '2026-05-16T22:00:00.000Z' },
  };

  it('becomes a game, players matched to the archive by name', () => {
    const game = fromLegacy(legacy, 2026);
    expect(game?.players.map((p) => p.id)[0]).toBe('matan');
    expect(game?.players[1]?.name.he).toBe('דנה');
    // The first site's result is not read: results come from the archive.
    expect(game?.result).toBeNull();
  });

  it('moves to the new key once, and is removed', () => {
    const store = memory({ eurorank_state_he_2026: JSON.stringify(legacy) });
    const games = loadGames(store);
    expect(games.get(2026)?.players).toHaveLength(2);
    expect(store.data.has('eurorank_state_he_2026')).toBe(false);
    expect(store.data.has(`${GAME_PREFIX}2026`)).toBe(true);
  });

  it('leaves nothing behind when it matched the archive', () => {
    const same = {
      ...legacy,
      players: game2026().players.map((p) => ({ id: p.id, name: p.name.he, prediction: p.order })),
    };
    const store = memory({ eurorank_state_he_2026: JSON.stringify(same) });
    expect(loadGames(store).get(2026)).toEqual(game2026());
    expect(store.data.size).toBe(0);
  });
});
