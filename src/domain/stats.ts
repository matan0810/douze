import type { Game, GamePlayer } from './game';
import { isComplete, scorePrediction, standings, type Standing } from './scoring';
import type { Bilingual } from './types';

/** The players whose prediction is complete: the only ones scored. */
export function scoredPlayers(game: Game): GamePlayer[] {
  return game.players.filter((p) => isComplete(p.order, game.finalists));
}

export function gameStandings(game: Game): Standing[] {
  const players = scoredPlayers(game).map((p) => ({ player: p.id, order: p.order }));
  return game.result ? standings(players, game.result, game.finalists) : [];
}

/**
 * The group's average place for every finalist, and the order those averages make: the
 * prediction of "all of us together". Ties keep the order of the field.
 */
export function consensus(game: Game) {
  const players = scoredPlayers(game);
  const average = new Map(
    game.finalists.map((id) => [
      id,
      players.length
        ? players.reduce((sum, p) => sum + p.order.indexOf(id) + 1, 0) / players.length
        : 0,
    ]),
  );
  const order = [...game.finalists].sort((a, b) => (average.get(a) ?? 0) - (average.get(b) ?? 0));
  return { average, order };
}

export interface Insights {
  /** The country that did best against what we expected. */
  surprise: { country: string; average: number; actual: number };
  /** The one that did worst against it. */
  letdown: { country: string; average: number; actual: number };
  /** Our average prediction, scored, and the place it would have taken in the table. */
  crowd: { total: number; rank: number };
  /** The country that won. */
  winner: string;
  /** Who placed the winner closest to first (all of them, if level). */
  prophets: { players: string[]; predicted: number };
  /** The country we agreed on most (smallest spread of predicted places). */
  agreed: { country: string; spread: number };
  /** The one we disagreed on most. */
  split: { country: string; spread: number };
}

/** What a final taught us. Needs the result and at least one complete prediction. */
export function insights(game: Game): Insights | undefined {
  const players = scoredPlayers(game);
  const result = game.result;
  const winner = result?.[0];
  if (!result || !winner || !players.length) return undefined;
  const { average, order } = consensus(game);
  const gaps = result.map((country, i) => ({
    country,
    average: average.get(country) ?? 0,
    actual: i + 1,
  }));
  const gap = (g: { average: number; actual: number }) => g.average - g.actual;
  const pick = (better: (a: number, b: number) => boolean) =>
    gaps.reduce((best, g) => (better(gap(g), gap(best)) ? g : best));
  const crowd = scorePrediction('crowd', order, result).total;
  const table = gameStandings(game);
  const rank = 1 + table.filter((s) => s.total > crowd).length;
  const winnerPlaces = players.map((p) => ({ id: p.id, place: p.order.indexOf(winner) + 1 }));
  const closest = Math.min(...winnerPlaces.map((w) => w.place));
  const spreads = result.map((country) => {
    const places = players.map((p) => p.order.indexOf(country) + 1);
    return { country, spread: Math.max(...places) - Math.min(...places) };
  });
  return {
    surprise: pick((a, b) => a > b),
    letdown: pick((a, b) => a < b),
    crowd: { total: crowd, rank },
    winner,
    prophets: {
      players: winnerPlaces.filter((w) => w.place === closest).map((w) => w.id),
      predicted: closest,
    },
    agreed: spreads.reduce((best, s) => (s.spread < best.spread ? s : best)),
    split: spreads.reduce((best, s) => (s.spread > best.spread ? s : best)),
  };
}

export interface GridRow {
  country: string;
  actual: number;
  average: number;
  /** Each scored player's predicted place, in the order of `scoredPlayers`. */
  predicted: number[];
}

/** Country by country: where each of us put it, against where it finished. */
export function countryGrid(game: Game): GridRow[] {
  const players = scoredPlayers(game);
  const { average } = consensus(game);
  return (game.result ?? []).map((country, i) => ({
    country,
    actual: i + 1,
    average: average.get(country) ?? 0,
    predicted: players.map((p) => p.order.indexOf(country) + 1),
  }));
}

export interface Duel {
  a: string;
  b: string;
  /** Countries where a's prediction was closer, b's was, and both equally close. */
  aCloser: number;
  bCloser: number;
  even: number;
}

/** Every pair of scored players, in table order: who was closer, country by country. */
export function headToHead(game: Game): Duel[] {
  const result = game.result;
  if (!result) return [];
  const byId = new Map(scoredPlayers(game).map((p) => [p.id, p]));
  const ids = gameStandings(game).map((s) => s.player);
  const duels: Duel[] = [];
  ids.forEach((a, i) =>
    ids.slice(i + 1).forEach((b) => {
      const pa = byId.get(a);
      const pb = byId.get(b);
      if (!pa || !pb) return;
      const duel = { a, b, aCloser: 0, bCloser: 0, even: 0 };
      result.forEach((country, place) => {
        const offA = Math.abs(pa.order.indexOf(country) - place);
        const offB = Math.abs(pb.order.indexOf(country) - place);
        if (offA < offB) duel.aCloser++;
        else if (offB < offA) duel.bCloser++;
        else duel.even++;
      });
      duels.push(duel);
    }),
  );
  return duels;
}

export interface Career {
  /** The player's id, or their name for players added on a device. */
  key: string;
  name: Bilingual;
  finals: number;
  titles: number;
  podiums: number;
  points: number;
  /** Average share of the maximum, 0 to 1. */
  average: number;
  best: { year: number; total: number; share: number };
}

/**
 * Every player across every final with a result. The same person is recognised by id;
 * players added on a device have no id of the archive, so their name joins them.
 */
export function careers(games: readonly Game[]): Career[] {
  const all = new Map<string, Career>();
  for (const game of games) {
    const byId = new Map(game.players.map((p) => [p.id, p]));
    for (const s of gameStandings(game)) {
      const player = byId.get(s.player);
      if (!player) continue;
      const key = /^p[0-9a-z]+(-\d+)?$/.test(player.id) ? `name:${player.name.he}` : player.id;
      const known = all.get(key);
      const entry: Career = known ?? {
        key,
        name: player.name,
        finals: 0,
        titles: 0,
        podiums: 0,
        points: 0,
        average: 0,
        best: { year: game.year, total: s.total, share: s.share },
      };
      entry.average = (entry.average * entry.finals + s.share) / (entry.finals + 1);
      entry.finals++;
      entry.points += s.total;
      if (s.rank === 1) entry.titles++;
      if (s.rank <= 3) entry.podiums++;
      if (s.share > entry.best.share)
        entry.best = { year: game.year, total: s.total, share: s.share };
      all.set(key, entry);
    }
  }
  return [...all.values()].sort(
    (a, b) => b.titles - a.titles || b.average - a.average || b.points - a.points,
  );
}
