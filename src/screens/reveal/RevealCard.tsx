import type { Piece } from '../../domain/pieces';
import type { Standing } from '../../domain/scoring';
import { useCountUp } from '../../hooks/useCountUp';
import { useI18n } from '../../i18n/context';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import styles from './RevealScreen.module.css';

const METALS = [styles.gold, styles.silver, styles.bronze];

/** A revealed place: it lands, and its points count up. */
export function RevealCard({
  standing: s,
  name,
  piece,
}: {
  standing: Standing;
  name: string;
  piece: Piece;
}) {
  const { t } = useI18n();
  const points = useCountUp(s.total, 300);
  const first = s.rank === 1;
  return (
    <li
      className={`land piece-card ${first ? 'piece-card-first' : ''} ${styles.card}`}
      style={pieceColour(piece)}
    >
      <span className={`${styles.place} ${METALS[s.rank - 1] ?? ''} num`} aria-hidden="true">
        {String(s.rank).padStart(2, '0')}
      </span>
      <span className="visually-hidden">{t.reveal.place(s.rank)}</span>
      <Token name={name} piece={piece} size="lg" />
      <span className={styles.name}>{name}</span>
      <span className={`${styles.points} num`} aria-label={String(s.total)}>
        {points}
      </span>
    </li>
  );
}
