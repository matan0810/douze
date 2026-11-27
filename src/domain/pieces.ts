import type { Game } from './game';
import type { Player } from './types';

/**
 * Each player's game piece: a colour that is theirs on every screen and every year
 * (DESIGN.md, section 2). The archive's players name theirs in players.json; a player added
 * on a device takes the first one nobody in that final has, in the order of the final.
 */
export const PIECES = ['pink', 'cyan', 'violet', 'gold', 'lime', 'coral', 'sky', 'orange'] as const;
export type Piece = (typeof PIECES)[number];

export function isPiece(value: unknown): value is Piece {
  return PIECES.some((piece) => piece === value);
}

export function playerPieces(game: Game, archive: readonly Player[]): Map<string, Piece> {
  const own = new Map(archive.flatMap((p) => (p.piece ? [[p.id, p.piece] as const] : [])));
  const pieces = new Map<string, Piece>();
  for (const player of game.players) {
    const piece = own.get(player.id);
    if (piece) pieces.set(player.id, piece);
  }
  const taken = new Set(pieces.values());
  let next = 0;
  for (const player of game.players) {
    if (pieces.has(player.id)) continue;
    const free = PIECES.filter((p) => !taken.has(p));
    // more players than pieces: the colours come round again
    const piece = free[0] ?? PIECES[next++ % PIECES.length] ?? 'pink';
    pieces.set(player.id, piece);
    taken.add(piece);
  }
  return pieces;
}
