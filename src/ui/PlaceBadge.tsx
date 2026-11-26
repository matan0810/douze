import styles from './PlaceBadge.module.css';

const MEDALS = ['🥇', '🥈', '🥉'];
const TONES = [styles.first, styles.second, styles.third];

/** A place in a ranking: a medal for the first three, the number after. */
export function PlaceBadge({ place }: { place: number }) {
  return (
    <span className={`${styles.badge} ${TONES[place - 1] ?? styles.rest} num`}>
      {MEDALS[place - 1] ?? place}
    </span>
  );
}
