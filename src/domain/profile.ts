import type { Game } from './game';
import { consensus, gameStandings, scoredPlayers } from './stats';

/**
 * What each player's prediction of a final says about them (DESIGN.md, section 4), and
 * what the group's predictions say together. Everything here needs the result.
 */

/** The group's own country, the one we watch with our hearts. */
export const HOME = 'israel';
/** The countries that go straight to the final and pay for the contest. */
export const BIG_FIVE = ['france', 'germany', 'italy', 'spain', 'united-kingdom'] as const;

export interface PlayerProfile {
  player: string;
  /** How many of the actual top ten were in their top ten. */
  topTen: number;
  /** The country they missed by most. */
  miss: { country: string; predicted: number; actual: number };
  /** The call furthest from the group that proved closer than the group; null if none. */
  bold: { country: string; predicted: number; actual: number; average: number } | null;
  /** Average places off in the actual top half of the table, and in the bottom half. */
  halves: { top: number; bottom: number };
}

/** The top ten, or fewer in a smaller final. */
export function topSize(size: number): number {
  return Math.min(10, size);
}

export function profiles(game: Game): PlayerProfile[] {
  const result = game.result;
  if (!result) return [];
  const actual = new Map(result.map((id, i) => [id, i + 1]));
  const { average } = consensus(game);
  const players = new Map(scoredPlayers(game).map((p) => [p.id, p]));
  const top = new Set(result.slice(0, topSize(result.length)));
  const half = Math.floor(result.length / 2);
  return gameStandings(game).flatMap((s) => {
    const p = players.get(s.player);
    if (!p) return [];
    const placed = p.order.map((country, i) => ({
      country,
      predicted: i + 1,
      actual: actual.get(country) ?? 0,
      average: average.get(country) ?? 0,
    }));
    const off = (c: { predicted: number; actual: number }) => Math.abs(c.predicted - c.actual);
    const gain = (c: (typeof placed)[number]) => Math.abs(c.average - c.actual) - off(c);
    const miss = placed.reduce((worst, c) => (off(c) > off(worst) ? c : worst));
    const bold = placed.reduce((best, c) => (gain(c) > gain(best) ? c : best));
    const mean = (list: typeof placed) =>
      list.length ? list.reduce((sum, c) => sum + off(c), 0) / list.length : 0;
    return [
      {
        player: p.id,
        topTen: p.order.slice(0, topSize(result.length)).filter((id) => top.has(id)).length,
        miss: { country: miss.country, predicted: miss.predicted, actual: miss.actual },
        bold: gain(bold) > 0 ? bold : null,
        halves: {
          top: mean(placed.filter((c) => c.actual <= half)),
          bottom: mean(placed.filter((c) => c.actual > half)),
        },
      },
    ];
  });
}

export interface Twins {
  a: string;
  b: string;
  /** Average places apart, country by country. */
  apart: number;
}

/** Every pair of players by how alike they predicted, the most alike first. */
export function twins(game: Game): Twins[] {
  const players = scoredPlayers(game);
  const pairs: Twins[] = [];
  players.forEach((a, i) =>
    players.slice(i + 1).forEach((b) => {
      const apart =
        a.order.reduce((sum, id, place) => sum + Math.abs(place - b.order.indexOf(id)), 0) /
        Math.max(1, a.order.length);
      pairs.push({ a: a.id, b: b.id, apart });
    }),
  );
  return pairs.sort((x, y) => x.apart - y.apart);
}

export interface CountryCall {
  country: string;
  actual: number;
  /** Each scored player's place for it, by id. */
  predicted: { player: string; place: number }[];
}

/** Where each of us put some countries (home, the big five), against where they finished. */
export function calls(game: Game, countries: readonly string[]): CountryCall[] {
  const result = game.result;
  if (!result) return [];
  const players = scoredPlayers(game);
  return countries
    .filter((id) => result.includes(id))
    .map((country) => ({
      country,
      actual: result.indexOf(country) + 1,
      predicted: players.map((p) => ({ player: p.id, place: p.order.indexOf(country) + 1 })),
    }));
}
