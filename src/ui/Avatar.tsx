import styles from './Avatar.module.css';

type Tone = 'action' | 'gold' | 'silver' | 'bronze';

/** A player's initial in a rounded square. */
export function Avatar({
  name,
  tone = 'action',
  size = 48,
}: {
  name: string;
  tone?: Tone;
  size?: number;
}) {
  return (
    <span
      className={`${styles.avatar} ${styles[tone]}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
