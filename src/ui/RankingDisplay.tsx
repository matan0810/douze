import { countryById } from '../domain/archive';
import { useI18n } from '../i18n/context';
import { Flag } from './Flag';
import { PlaceBadge } from './PlaceBadge';
import styles from './RankingDisplay.module.css';

/** A finished ranking, read only: place, flag and name of every country. */
export function RankingDisplay({ order }: { order: readonly string[] }) {
  const { language } = useI18n();
  return (
    <ol className={styles.list}>
      {order.map((id, i) => {
        const country = countryById.get(id);
        return (
          <li key={id} className={`${styles.row} glass`}>
            <PlaceBadge place={i + 1} />
            <Flag country={country} size="lg" />
            <span className={styles.name}>{country?.name[language] ?? id}</span>
            <span className={styles.other}>
              {language === 'he' ? country?.name.en : country?.name.he}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
