import { createContext, useContext } from 'react';
import type { Game } from '../domain/game';

export interface Games {
  /** Every final this device knows, by year. */
  games: ReadonlyMap<number, Game>;
  /** Their years, newest first. */
  years: number[];
  /** Changes one final; it is saved on this device. */
  update: (year: number, change: (game: Game) => Game) => void;
  /** Puts a whole final in place (one created here). */
  put: (game: Game) => void;
  /** Whether this device's final differs from the site's archive. */
  edited: (year: number) => boolean;
  /** Back to the archive's final, or away, for one created here. */
  reset: (year: number) => void;
}

export const GamesContext = createContext<Games | null>(null);

export function useGames(): Games {
  const games = useContext(GamesContext);
  if (!games) throw new Error('useGames outside GamesProvider');
  return games;
}

/** The final of one year, or undefined if this device does not know it. */
export function useGame(year: number) {
  const games = useGames();
  return games.games.get(year);
}
