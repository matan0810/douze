import type { Standing } from './scoring';

/**
 * The reveal ceremony's steps (DESIGN.md, section 4): the table from the last place to the
 * first, one place at a time; players level on a place are revealed together.
 */
export function revealSteps<T extends Pick<Standing, 'rank'>>(table: readonly T[]): T[][] {
  const ranks = [...new Set(table.map((s) => s.rank))].sort((a, b) => b - a);
  return ranks.map((rank) => table.filter((s) => s.rank === rank));
}
