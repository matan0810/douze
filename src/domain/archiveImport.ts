import type { ImportStage, ImportYear } from '../../shared/importYear';
import { type Entry } from '../../shared/years';
import { archive } from './archive';
import { gameFromEdition, type Game } from './game';

/**
 * The archive's years, as a group's owner sends them to the server once (issue #6, step 2):
 * every stage already closed, with its result and every player's prediction under their
 * Hebrew name (the group's language), so the people who wrote them can claim their names.
 */

/** When an archived stage is said to have closed: the end of May of its year. */
export function archivedLock(year: number): number {
  return Date.UTC(year, 4, 31, 23, 59);
}

/** The years the archive holds, oldest first. */
export function archivedYears(): number[] {
  return archive.editions.map((e) => e.year).sort((a, b) => a - b);
}

export function importYearOf(game: Game): ImportYear {
  const lockAt = archivedLock(game.year);
  const nameOf = new Map(game.players.map((p) => [p.id, p.name.he]));
  const stages: ImportStage[] = [];
  if (game.finalists.length >= 2)
    stages.push({
      stage: 'final',
      countries: game.finalists,
      lockAt,
      joker: game.options.joker,
      result: game.result,
      entries: game.players.map((p) => ({
        name: p.name.he,
        entry: { order: p.order, joker: p.joker ?? null } satisfies Entry,
      })),
    });
  game.semis.forEach((semi, i) => {
    if (semi.countries.length < 2) return;
    stages.push({
      stage: i === 0 ? 'semi-1' : 'semi-2',
      countries: semi.countries,
      lockAt,
      joker: false,
      result: semi.qualifiers,
      entries: semi.predictions.flatMap((p) => {
        const name = nameOf.get(p.player);
        return name ? [{ name, entry: { picks: p.picks, reserve: p.reserve } }] : [];
      }),
    });
  });
  return { stages };
}

/** One archive year in the shape the server takes, or undefined if the archive lacks it. */
export function archiveYearBody(year: number): ImportYear | undefined {
  const edition = archive.editions.find((e) => e.year === year);
  return edition ? importYearOf(gameFromEdition(edition, archive.players)) : undefined;
}
