import styles from './Wordmark.module.css';

/**
 * The name, Douze, with the mirror ball for its O (DESIGN.md, section 2). Always left to
 * right, in both languages; read as one word by screen readers.
 */
export function Wordmark({ size }: { size: 'bar' | 'hero' }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} dir="ltr" role="img" aria-label="Douze">
      <span className={styles.start} aria-hidden="true">
        D
      </span>
      <img
        className={styles.ball}
        src={`${import.meta.env.BASE_URL}brand/ball.svg`}
        alt=""
        aria-hidden="true"
      />
      <span className={styles.end} aria-hidden="true">
        uze
      </span>
    </span>
  );
}
