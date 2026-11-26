import styles from './PlaceBadge.module.css';

const METALS = [styles.gold, styles.silver, styles.bronze];

/** A place in a ranking, as a two-digit numeral; the first three in their metals. */
export function PlaceBadge({ place }: { place: number }) {
  return (
    <span className={`${styles.badge} ${METALS[place - 1] ?? styles.rest} num`}>
      {String(place).padStart(2, '0')}
    </span>
  );
}
