import type { Piece } from '../../domain/pieces';
import type { Duel } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { Token } from '../../ui/Token';
import page from './StatsScreen.module.css';
import styles from './Duels.module.css';

interface Props {
  duels: Duel[];
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
}

/** Every pair of players: in how many countries each was closer, as a split bar. */
export function Duels({ duels, names, pieces }: Props) {
  const { t } = useI18n();
  return (
    <section className={page.section} aria-labelledby="duels-title">
      <div className={page.sectionHead}>
        <h2 id="duels-title">
          <Icon name="duel" size={16} />
          {t.stats.duels}
        </h2>
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
                <span className={`${styles.who} ${aWins ? styles.winner : ''}`}>
                  <Token
                    name={names.get(d.a) ?? ''}
                    piece={pieces.get(d.a) ?? 'violet'}
                    size="sm"
                  />
                  {names.get(d.a)}
                </span>
                <span className={`${styles.score} num`}>
                  {d.aCloser} : {d.bCloser}
                </span>
                <span className={`${styles.who} ${bWins ? styles.winner : ''}`}>
                  {names.get(d.b)}
                  <Token
                    name={names.get(d.b) ?? ''}
                    piece={pieces.get(d.b) ?? 'violet'}
                    size="sm"
                  />
                </span>
              </div>
              <div className={styles.bar} aria-hidden="true">
                <span
                  className={styles.a}
                  style={{
                    background: `var(--piece-${pieces.get(d.a) ?? 'violet'})`,
                    width: `${(d.aCloser / total) * 100}%`,
                  }}
                />
                <span className={styles.even} style={{ width: `${(d.even / total) * 100}%` }} />
                <span
                  className={styles.b}
                  style={{
                    background: `var(--piece-${pieces.get(d.b) ?? 'violet'})`,
                    width: `${(d.bCloser / total) * 100}%`,
                  }}
                />
              </div>
              <p className={styles.note}>{t.stats.even(d.even)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
