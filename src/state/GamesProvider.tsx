import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { differs, type Game } from '../domain/game';
import { GamesContext, type Games } from './context';
import { baselineGame, browserStore, GAME_PREFIX, loadGames, saveGame } from './games';

/** Holds every final for the whole page, and keeps each on this device as it changes. */
export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState(() => loadGames(browserStore));

  const put = useCallback((game: Game) => {
    saveGame(browserStore, game);
    setGames((all) => new Map(all).set(game.year, game));
  }, []);

  const update = useCallback(
    (year: number, change: (game: Game) => Game) =>
      setGames((all) => {
        const game = all.get(year);
        if (!game) return all;
        const next = change(game);
        saveGame(browserStore, next);
        return new Map(all).set(year, next);
      }),
    [],
  );

  const reset = useCallback((year: number) => {
    browserStore.remove(GAME_PREFIX + year);
    setGames((all) => {
      const next = new Map(all);
      const baseline = baselineGame(year);
      if (baseline.finalists.length) next.set(year, baseline);
      else next.delete(year);
      return next;
    });
  }, []);

  const value = useMemo<Games>(
    () => ({
      games,
      years: [...games.keys()].sort((a, b) => b - a),
      update,
      put,
      reset,
      edited: (year) => {
        const game = games.get(year);
        return !!game && differs(game, baselineGame(year));
      },
    }),
    [games, update, put, reset],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}
