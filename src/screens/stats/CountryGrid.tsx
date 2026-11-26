import { countryById } from '../../domain/archive';
import type { GamePlayer } from '../../domain/game';
import type { GridRow } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import { closeness } from '../results/closeness';
import { Icon } from '../../ui/Icon';
import page from './StatsScreen.module.css';
import styles from './CountryGrid.module.css';

interface Props {
  rows: GridRow[];
  players: GamePlayer[];
}

/** Every country in the order it finished, with the place each of us gave it. */
export function CountryGrid({ rows, players }: Props) {
  const { t, language } = useI18n();
  return (
    <section className={page.section} aria-labelledby="grid-title">
      <div className={page.sectionHead}>
        <h2 id="grid-title">
          <Icon name="grid" size={16} />
          {t.stats.grid}
        </h2>
        <p>{t.stats.gridHint}</p>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th className={styles.country}>{t.breakdown.country}</th>
              {players.map((p) => (
                <th key={p.id}>{p.name[language]}</th>
              ))}
              <th>{t.stats.average}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const country = countryById.get(row.country);
              return (
                <tr key={row.country}>
                  <td className={`${styles.place} num`}>{row.actual}</td>
                  <td className={styles.country}>
                    <span className={styles.name}>
                      <Flag country={country} size="sm" />
                      {country?.name[language]}
                    </span>
                  </td>
                  {row.predicted.map((place, i) => (
                    <td key={players[i]?.id ?? i}>
                      <span
                        className={`${styles.cell} ${styles[closeness(Math.abs(place - row.actual))]} num`}
                      >
                        {place}
                      </span>
                    </td>
                  ))}
                  <td className={`${styles.average} num`}>
                    {(Math.round(row.average * 10) / 10).toString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
