import type { Game } from './game';
import { PERFECT_BONUS, semiStandings } from './semis';
import { gameStandings } from './stats';

export interface SeasonRow {
  player: string;
  /** Points in the final, and in each semi; null where there is no scored prediction. */
  final: number | null;
  semis: (number | null)[];
  /** PERFECT_BONUS for every semi with all ten qualifiers right. */
  bonus: number;
  total: number;
  rank: number;
}

/**
 * The season: the final and the semis added up, with the semis' perfect bonus
 * (DESIGN.md, section 3). Everyone with any scored prediction is in it; a stage they did not
 * predict counts nothing.
 */
export function seasonStandings(game: Game): SeasonRow[] {
  const final = new Map(gameStandings(game).map((s) => [s.player, s.total]));
  const semis = game.semis.map((semi) => new Map(semiStandings(semi).map((s) => [s.player, s])));
  const ids = new Set([...final.keys(), ...semis.flatMap((m) => [...m.keys()])]);
  const rows = game.players
    .filter((p) => ids.has(p.id))
    .map((p) => {
      const own = semis.map((m) => m.get(p.id));
      const bonus = own.filter((s) => s?.perfect).length * PERFECT_BONUS;
      const finalPoints = final.get(p.id) ?? null;
      const semiPoints = own.map((s) => s?.points ?? null);
      const total =
        (finalPoints ?? 0) + semiPoints.reduce<number>((a, b) => a + (b ?? 0), 0) + bonus;
      return { player: p.id, final: finalPoints, semis: semiPoints, bonus, total, rank: 0 };
    })
    .sort((a, b) => b.total - a.total);
  return rows.map((r) => ({ ...r, rank: 1 + rows.filter((o) => o.total > r.total).length }));
}
