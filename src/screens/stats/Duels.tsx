import type { Duel } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import page from './StatsScreen.module.css';
import styles from './Duels.module.css';

interface Props {
  duels: Duel[];
  names: ReadonlyMap<string, string>;
}

/** Every pair of players: in how many countries each was closer, as a split bar. */
export function Duels({ duels, names }: Props) {
  const { t } = useI18n();
  return (
    <section className={`${page.section} glass panel`} aria-labelledby="duels-title">
      <div className={page.sectionHead}>
        <h2 id="duels-title">{t.stats.duels}</h2>
        <p>{t.stats.duelsHint}</p>
      </div>
      <ul className={styles.list}>
        {duels.map((d) => {
          const total = d.aCloser + d.bCloser + d.even || 1;
          const aWins = d.aCloser > d.bCloser;
          const bWins = d.bCloser > d.aCloser;
          return (
            <li key={`${d.a}-${d.b}`} className={styles.duel}>
              <div className={styles.names}>
                <span className={aWins ? styles.winner : undefined}>{names.get(d.a)}</span>
                <span className={`${styles.score} num`}>
                  {d.aCloser} : {d.bCloser}
                </span>
                <span className={bWins ? styles.winner : undefined}>{names.get(d.b)}</span>
              </div>
              <div className={styles.bar} aria-hidden="true">
                <span className={styles.a} style={{ width: `${(d.aCloser / total) * 100}%` }} />
                <span className={styles.even} style={{ width: `${(d.even / total) * 100}%` }} />
                <span className={styles.b} style={{ width: `${(d.bCloser / total) * 100}%` }} />
              </div>
              <p className={styles.note}>{t.stats.even(d.even)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
