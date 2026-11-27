/**
 * The semi-finals (DESIGN.md, section 3): each player names the ten countries they expect to
 * qualify, and an eleventh as a reserve. A semi stands on its own: who qualified does not
 * make the final's field (the host and the big five reach the final without a semi), and
 * its field and result are set by hand.
 */

export const MAX_SEMIS = 2;
/** How many countries a semi sends to the final. */
export const QUALIFIERS = 10;
export const QUALIFIER_POINTS = 2;
export const RESERVE_POINTS = 1;
/** For all ten qualifiers right: counted in the season's table only, not the semi's own. */
export const PERFECT_BONUS = 5;

export interface SemiPick {
  player: string;
  /** The countries expected to qualify, in no order. */
  picks: string[];
  /** The eleventh: points if it qualified, though it was not among the ten. */
  reserve: string | null;
}

export interface Semi {
  countries: string[];
  /** The countries that qualified; null until known. */
  qualifiers: string[] | null;
  predictions: SemiPick[];
}

/** How many qualify from a semi of this many countries: ten, unless the field is smaller. */
export function qualifierCount(countries: readonly string[]): number {
  return Math.max(0, Math.min(QUALIFIERS, countries.length - 1));
}

/** A complete pick: the right number of distinct countries of the semi, and a reserve. */
export function isCompletePick(pick: Omit<SemiPick, 'player'>, semi: Pick<Semi, 'countries'>) {
  const field = new Set(semi.countries);
  const picks = new Set(pick.picks);
  return (
    picks.size === pick.picks.length &&
    pick.picks.length === qualifierCount(semi.countries) &&
    pick.picks.every((id) => field.has(id)) &&
    pick.reserve !== null &&
    field.has(pick.reserve) &&
    !picks.has(pick.reserve)
  );
}

/** A complete result: the right number of distinct countries of the semi. */
export function isCompleteQualifiers(qualifiers: readonly string[], countries: readonly string[]) {
  const field = new Set(countries);
  return (
    new Set(qualifiers).size === qualifiers.length &&
    qualifiers.length === qualifierCount(countries) &&
    qualifiers.every((id) => field.has(id))
  );
}

export interface SemiScore {
  player: string;
  /** Picks that qualified. */
  hits: number;
  reserveHit: boolean;
  points: number;
  /** Every pick qualified: the season's bonus. */
  perfect: boolean;
  rank: number;
}

export function scoreSemiPick(pick: SemiPick, qualifiers: readonly string[]) {
  const qualified = new Set(qualifiers);
  const hits = pick.picks.filter((id) => qualified.has(id)).length;
  const reserveHit = pick.reserve !== null && qualified.has(pick.reserve);
  return {
    player: pick.player,
    hits,
    reserveHit,
    points: hits * QUALIFIER_POINTS + (reserveHit ? RESERVE_POINTS : 0),
    perfect: pick.picks.length > 0 && hits === pick.picks.length,
  };
}

/** A semi's own table: complete picks only, by points; level players share the rank. */
export function semiStandings(semi: Semi): SemiScore[] {
  const qualifiers = semi.qualifiers;
  if (!qualifiers) return [];
  const scores = semi.predictions
    .filter((p) => isCompletePick(p, semi))
    .map((p) => scoreSemiPick(p, qualifiers))
    .sort((a, b) => b.points - a.points);
  return scores.map((s) => ({ ...s, rank: 1 + scores.filter((o) => o.points > s.points).length }));
}
