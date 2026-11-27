import type { Piece } from '../domain/pieces';
import styles from './Token.module.css';

/** A player's game piece: a disc in their colour with their initial. */
export function Token({
  name,
  piece,
  size = 'md',
}: {
  name: string;
  piece: Piece;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={`${styles.token} ${styles[size]}`}
      style={{ background: `var(--piece-${piece})` }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
