import { countryById } from '../domain/archive';
import { useI18n } from '../i18n/context';
import { Flag } from './Flag';
import styles from './CountryChips.module.css';

export type ChipState = 'on' | 'reserve' | 'off';

interface Props {
  countries: readonly string[];
  state: (id: string) => ChipState;
  /** A label beside the name, such as "11". */
  mark?: (id: string) => string | undefined;
  /** Without it the chips only show; with it each is a switch. */
  onTap?: (id: string) => void;
}

/** Countries as round chips, sorted by name: lit when on, in gold when the reserve. */
export function CountryChips({ countries, state, mark, onTap }: Props) {
  const { language } = useI18n();
  const sorted = [...countries].sort((a, b) =>
    (countryById.get(a)?.name[language] ?? a).localeCompare(
      countryById.get(b)?.name[language] ?? b,
      language,
    ),
  );
  return (
    <ul className={styles.grid}>
      {sorted.map((id) => {
        const country = countryById.get(id);
        const s = state(id);
        const className = `${styles.chip} ${styles[s]}`;
        const content = (
          <>
            <Flag country={country} size="sm" />
            <span className={styles.name}>{country?.name[language] ?? id}</span>
            {mark?.(id) && <span className={`${styles.mark} num`}>{mark(id)}</span>}
          </>
        );
        return (
          <li key={id}>
            {onTap ? (
              <button
                type="button"
                className={className}
                aria-pressed={s !== 'off'}
                onClick={() => onTap(id)}
              >
                {content}
              </button>
            ) : (
              <span className={className}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
