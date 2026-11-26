import styles from './StarBackground.module.css';

/** A small seeded random generator, so the light is the same on every visit and screenshot. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TONES = [styles.white, styles.pink, styles.violet, styles.gold];
const random = seeded(2026);
const REFLECTIONS = Array.from({ length: 72 }, (_, i) => ({
  x: random() * 100,
  y: random() * 100,
  size: 2 + random() * 3,
  delay: random() * 7,
  duration: 5 + random() * 5,
  tone: TONES[i % TONES.length],
}));

/**
 * The room behind every page: a spotlight from above, and the square reflections the
 * mirror ball throws on the walls, slowly catching the light.
 */
export function StarBackground() {
  return (
    <div className={styles.room} aria-hidden="true">
      <div className={styles.spot} />
      {REFLECTIONS.map((r, i) => (
        <span
          key={i}
          className={`${styles.reflection} ${r.tone}`}
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: r.size,
            height: r.size,
            animationDuration: `${r.duration}s`,
            animationDelay: `${r.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
