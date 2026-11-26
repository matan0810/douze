import styles from './StarBackground.module.css';

/** A small seeded random generator, so the sky is the same on every visit and screenshot. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(2026);
const STARS = Array.from({ length: 80 }, () => ({
  x: random() * 100,
  y: random() * 100,
  size: random() * 3 + 1,
  delay: random() * 4,
  duration: random() * 3 + 2,
}));
const SPARKLES = Array.from({ length: 15 }, () => ({
  x: random() * 100,
  y: random() * 100,
  delay: random() * 3,
}));

/** The night sky behind every page: nebulae, twinkling stars and a few golden sparkles. */
export function StarBackground() {
  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.base} />
      <div className={`${styles.nebula} ${styles.purple}`} />
      <div className={`${styles.nebula} ${styles.pink}`} />
      <div className={`${styles.nebula} ${styles.blue}`} />
      {STARS.map((star, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className={styles.sparkle}
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s` }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
