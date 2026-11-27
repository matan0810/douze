import { archive } from '../domain/archive';
import { useI18n } from '../i18n/context';
import { Flag } from './Flag';
import { Icon } from './Icon';
import styles from './FinalistsChooser.module.css';

interface Props {
  chosen: readonly string[];
  onChange: (next: string[]) => void;
  /** Countries that cannot be chosen here, with why (they are in the other semi). */
  taken?: ReadonlyMap<string, string>;
  hint?: string;
}

/** Every country of the catalogue as a switch: on means it is in the final. */
export function FinalistsChooser({ chosen, onChange, taken, hint }: Props) {
  const { t, language } = useI18n();
  const sorted = [...archive.countries].sort((a, b) =>
    a.name[language].localeCompare(b.name[language], language),
  );
  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>
        {hint ?? t.players.finalistsHint} · <span className="num">{chosen.length}</span>
      </p>
      <div className={styles.grid}>
        {sorted.map((country) => {
          const on = chosen.includes(country.id);
          const elsewhere = taken?.get(country.id);
          return (
            <button
              key={country.id}
              type="button"
              aria-pressed={on}
              disabled={!!elsewhere}
              className={on ? `${styles.chip} ${styles.on}` : styles.chip}
              onClick={() =>
                onChange(
                  on
                    ? chosen.filter((id) => id !== country.id)
                    : archive.countries
                        .map((c) => c.id)
                        .filter((id) => id === country.id || chosen.includes(id)),
                )
              }
            >
              <Flag country={country} size="sm" />
              <span>{country.name[language]}</span>
              {on && <Icon name="check" size={14} />}
              {elsewhere && <small className={styles.taken}>{elsewhere}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
