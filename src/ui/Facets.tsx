import { useEffect, useState } from 'react';
import styles from './Facets.module.css';

const COLOURS = ['--brand-pink', '--brand-violet', '--brand-gold', '--piece-cyan', '--text'];
const COUNT = 80;

/** A small seeded random generator: the same burst every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const random = seeded(12);
const PIECES = Array.from({ length: COUNT }, (_, i) => ({
  left: random() * 100,
  size: 6 + random() * 6,
  delay: random() * 0.6,
  duration: 1.8 + random() * 1.6,
  colour: COLOURS[i % COLOURS.length] ?? '--text',
}));

/**
 * A burst of the mirror ball's facets falling over the screen: the moment a winner is
 * shown. Once, after `delayMs`; gone after a few seconds; never with reduced motion.
 */
export function Facets({ delayMs = 0 }: { delayMs?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = setTimeout(() => setOn(true), delayMs);
    const stop = setTimeout(() => setOn(false), delayMs + 4200);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [delayMs]);

  if (!on) return null;
  return (
    <div className={styles.burst} aria-hidden="true">
      {PIECES.map((p, i) => (
        <i
          key={i}
          className={styles.facet}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: `var(${p.colour})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
