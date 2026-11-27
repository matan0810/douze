import { countryById } from '../../domain/archive';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import styles from './SettingsScreen.module.css';

interface Props {
  title: string;
  countries: readonly string[];
  onEdit: () => void;
}

/** One stage's countries, as flags with names, and the way to change them. */
export function FieldSection({ title, countries, onEdit }: Props) {
  const { t, language } = useI18n();
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className="section-label">
          {title} <span className="num">({countries.length})</span>
        </h2>
        <button type="button" className="btn btn-line" onClick={onEdit}>
          {t.players.editFinalists}
        </button>
      </div>
      {countries.length === 0 ? (
        <p className={styles.none}>{t.players.noFinalists}</p>
      ) : (
        <ul className={styles.flags}>
          {countries.map((id) => (
            <li key={id} className={styles.country}>
              <Flag country={countryById.get(id)} size="sm" />
              {countryById.get(id)?.name[language] ?? id}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
