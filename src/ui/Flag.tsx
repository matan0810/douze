import type { Country } from '../domain/types';
import styles from './Flag.module.css';

type Size = 'sm' | 'md' | 'lg' | 'xl';

/** A country's flag, from the site's own files; decorative (the name is always beside it). */
export function Flag({ country, size = 'lg' }: { country: Country | undefined; size?: Size }) {
  if (!country) return <span className={`${styles.flag} ${styles[size]}`} aria-hidden="true" />;
  return (
    <img
      className={`${styles.flag} ${styles[size]}`}
      src={`${import.meta.env.BASE_URL}flags/${country.code}.png`}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
