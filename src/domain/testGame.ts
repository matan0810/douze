import { archive } from './archive';
import { gameFromEdition, type Game } from './game';

/** The real 2026 final as a game, for tests. */
export function game2026(): Game {
  const edition = archive.editions.find((e) => e.year === 2026);
  if (!edition) throw new Error('2026 is missing');
  return gameFromEdition(edition, archive.players);
}
