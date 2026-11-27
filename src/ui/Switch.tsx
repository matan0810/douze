import styles from './Switch.module.css';

interface Props {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (on: boolean) => void;
}

/** An option that is on or off: a real switch, with its label and what it does. */
export function Switch({ label, hint, on, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={styles.switch}
      onClick={() => onChange(!on)}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <span className={on ? `${styles.track} ${styles.on}` : styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
