import type { CSSProperties } from 'react';
import type { Piece } from '../domain/pieces';

/** The colour of a player's piece as `--pc`, for a row or a bar that belongs to them. */
export function pieceColour(piece: Piece): CSSProperties {
  return { '--pc': `var(--piece-${piece})` } as CSSProperties;
}
