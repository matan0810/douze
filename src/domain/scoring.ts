/**
 * The scoring rule (DESIGN.md, section 3). For every country in the final, a prediction
 * earns 10 points less one for each place it is off, never below zero; the exact winner,
 * runner-up and third earn a bonus on top. In a year with jokers, the place points of each
 * player's joker count twice. Only a complete prediction (every finalist, each once) is
 * scored.
 */

export const BASE_POINTS = 10;
/** The bonus for placing first, second and third exactly. */
export const PODIUM_BONUS = [15, 10, 5] as const;
/** How many times the joker's place points count. */
export const JOKER_FACTOR = 2;

export interface CountryScore {
  country: string;
  /** 1-based places. */
  predicted: number;
  actual: number;
  /** How many places the prediction was off. */
  off: number;
  base: number;
  bonus: number;
  /** The player's joker: its place points count JOKER_FACTOR times. */
  joker: boolean;
  points: number;
}

export interface Score {
  player: string;
  total: number;
  max: number;
  /** total / max, 0 to 1. */
  share: number;
  /** Countries in the official order. */
  rows: CountryScore[];
  exact: number;
  /** Within one place, exact included. */
  close: number;
}

export function basePoints(off: number): number {
  return Math.max(0, BASE_POINTS - off);
}

export function bonusPoints(predicted: number, actual: number): number {
  return predicted === actual ? (PODIUM_BONUS[actual - 1] ?? 0) : 0;
}

/** The most a prediction can earn in a final of `size` countries, with or without jokers. */
export function maxScore(size: number, jokers = false): number {
  const bonus = PODIUM_BONUS.slice(0, size).reduce((sum, b) => sum + b, 0);
  const joker = jokers && size ? (JOKER_FACTOR - 1) * BASE_POINTS : 0;
  return size * BASE_POINTS + bonus + joker;
}

/** Whether `order` holds every country of `finalists` exactly once, and nothing else. */
export function isComplete(order: readonly string[], finalists: readonly string[]): boolean {
  if (order.length !== finalists.length) return false;
  const wanted = new Set(finalists);
  const seen = new Set<string>();
  for (const id of order) {
    if (!wanted.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/** Scores one complete prediction against the official order. */
export function scorePrediction(
  player: string,
  order: readonly string[],
  result: readonly string[],
  /** The player's joker, in a year with jokers; undefined in a year without. */
  joker?: string,
  jokers = joker !== undefined,
) {
  const predictedPlace = new Map(order.map((id, index) => [id, index + 1]));
  const rows: CountryScore[] = result.map((country, index) => {
    const actual = index + 1;
    const predicted = predictedPlace.get(country) ?? result.length;
    const off = Math.abs(predicted - actual);
    const base = basePoints(off);
    const bonus = bonusPoints(predicted, actual);
    const isJoker = country === joker;
    const points = base * (isJoker ? JOKER_FACTOR : 1) + bonus;
    return { country, predicted, actual, off, base, bonus, joker: isJoker, points };
  });
  const total = rows.reduce((sum, row) => sum + row.points, 0);
  const max = maxScore(result.length, jokers);
  return {
    player,
    total,
    max,
    share: max ? total / max : 0,
    rows,
    exact: rows.filter((row) => row.off === 0).length,
    close: rows.filter((row) => row.off <= 1).length,
  } satisfies Score;
}

export interface Standing extends Score {
  /** 1-based; players level on points share a rank. */
  rank: number;
}

/**
 * The table of a final: every complete prediction, best first. Ties on points are broken
 * by more exact places, then more within one; still level, they share the rank.
 */
export function standings(
  predictions: readonly { player: string; order: readonly string[]; joker?: string }[],
  result: readonly string[],
  finalists: readonly string[],
  /** Whether the year has jokers: without, a joker in the data counts nothing. */
  jokers = false,
): Standing[] {
  const scores = predictions
    .filter((p) => isComplete(p.order, finalists))
    .map((p) => scorePrediction(p.player, p.order, result, jokers ? p.joker : undefined, jokers))
    .sort((a, b) => b.total - a.total || b.exact - a.exact || b.close - a.close);
  return scores.map((score, index) => {
    let rank = index + 1;
    for (let i = index - 1; i >= 0; i--) {
      const prev = scores[i];
      if (!prev || !level(prev, score)) break;
      rank = i + 1;
    }
    return { ...score, rank };
  });
}

function level(a: Score, b: Score) {
  return a.total === b.total && a.exact === b.exact && a.close === b.close;
}
