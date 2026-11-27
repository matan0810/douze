import { useEffect, useState } from 'react';

/** Whether the visitor asked for less motion: then numbers simply appear. */
function reduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A number that counts up to its value once, after a delay, easing out: the points of the
 * table, as on a scoreboard. Later changes (live mode) show at once.
 */
export function useCountUp(value: number, delayMs = 0, durationMs = 1100): number {
  const [shown, setShown] = useState(() => (reduced() ? value : 0));
  const [done, setDone] = useState(() => reduced());

  useEffect(() => {
    if (done) return;
    let frame = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delayMs, durationMs, done]);

  // Once counted, the number follows its value at once (live mode changes it).
  return done ? value : shown;
}
