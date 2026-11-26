import { routeHash, type FinalView } from '../domain/routes';
import { navigate } from '../hooks/useRoute';
import { useI18n } from '../i18n/context';
import { useGames } from '../state/context';
import styles from './YearSelect.module.css';

const NEW = 'new';

/** Switches the screen to another year's final, or starts a new one. */
export function YearSelect({ year, view }: { year: number; view: FinalView }) {
  const { t } = useI18n();
  const { years } = useGames();
  return (
    <label className={styles.wrap}>
      <span className="visually-hidden">{t.yearPicker}</span>
      <select
        className={`${styles.select} glass`}
        value={year}
        onChange={(e) => {
          if (e.target.value === NEW) window.location.hash = routeHash({ name: 'new' });
          else navigate({ name: 'final', year: Number(e.target.value), view });
        }}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {t.final(y)}
          </option>
        ))}
        <option value={NEW}>{t.newFinalOption}</option>
      </select>
    </label>
  );
}
