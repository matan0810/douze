import type { Game } from './game';
import type { SeasonRow } from './season';
import type { SemiScore } from './semis';
import { gameStandings, insights } from './stats';

/**
 * The stickers a final gives its players (DESIGN.md, section 4), at most two each, in this
 * order: the champion; "almost", for a runner-up within ALMOST points of first; the
 * sharpshooter, for the most exact places (at least two); and the prophet, for whoever put
 * the winner highest.
 */
export type Badge =
  | { kind: 'champion' }
  | { kind: 'almost'; gap: number }
  | { kind: 'sharpshooter'; exact: number }
  | { kind: 'prophet'; place: number };

export const ALMOST = 15;
export const MAX_BADGES = 2;

export function badges(game: Game): Map<string, Badge[]> {
  const table = gameStandings(game);
  const found = insights(game);
  const out = new Map<string, Badge[]>(table.map((s) => [s.player, []]));
  const give = (player: string, badge: Badge) => {
    const list = out.get(player);
    if (list && list.length < MAX_BADGES) list.push(badge);
  };
  const top = table[0]?.total ?? 0;
  const mostExact = Math.max(0, ...table.map((s) => s.exact));
  for (const s of table) {
    if (s.rank === 1) give(s.player, { kind: 'champion' });
    if (s.rank === 2 && top - s.total <= ALMOST)
      give(s.player, { kind: 'almost', gap: top - s.total });
    if (mostExact >= 2 && s.exact === mostExact)
      give(s.player, { kind: 'sharpshooter', exact: s.exact });
    if (found?.prophets.players.includes(s.player))
      give(s.player, { kind: 'prophet', place: found.prophets.predicted });
  }
  return out;
}

/** The stickers of a semi or of the season: its champion, a perfect pick, a lucky 11th. */
export type StageBadge = { kind: 'champion' } | { kind: 'perfect' } | { kind: 'reserve' };

/** A semi's stickers, at most two each: champion, a perfect ten, the 11th that went through. */
export function semiBadges(table: readonly SemiScore[]): Map<string, StageBadge[]> {
  return new Map(
    table.map((s) => {
      const list: StageBadge[] = [];
      if (s.rank === 1) list.push({ kind: 'champion' });
      if (s.perfect) list.push({ kind: 'perfect' });
      if (s.reserveHit) list.push({ kind: 'reserve' });
      return [s.player, list.slice(0, MAX_BADGES)];
    }),
  );
}

/** The season's stickers: its champion, and a perfect semi (the bonus) for whoever had one. */
export function seasonBadges(rows: readonly SeasonRow[]): Map<string, StageBadge[]> {
  return new Map(
    rows.map((r) => {
      const list: StageBadge[] = [];
      if (r.rank === 1) list.push({ kind: 'champion' });
      if (r.bonus > 0) list.push({ kind: 'perfect' });
      return [r.player, list];
    }),
  );
}
