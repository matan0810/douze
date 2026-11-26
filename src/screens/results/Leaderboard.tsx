import { routeHash } from '../../domain/routes';
import type { Standing } from '../../domain/scoring';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import styles from './Leaderboard.module.css';

interface Props {
  year: number;
  table: Standing[];
  names: ReadonlyMap<string, string>;
}

const METALS = [styles.gold, styles.silver, styles.bronze];

/**
 * The table as a scoreboard: each player on a hairline row, their place as a large numeral
 * (the first three in their metals), their points thin and large. The leader's row and
 * score catch the ball's light.
 */
export function Leaderboard({ year, table, names }: Props) {
  const { t } = useI18n();
  return (
    <ol className={styles.list}>
      {table.map((s, i) => {
        const name = names.get(s.player) ?? s.player;
        const percent = Math.round(s.share * 100);
        const first = s.rank === 1;
        return (
          <li key={s.player} className="rise" style={{ animationDelay: `${i * 0.07}s` }}>
            <a
              href={routeHash({ name: 'player', year, id: s.player })}
              className={first ? `${styles.row} ${styles.first}` : styles.row}
            >
              <span
                className={`${styles.place} ${METALS[s.rank - 1] ?? ''} num`}
                aria-hidden="true"
              >
                {String(s.rank).padStart(2, '0')}
              </span>
              <span className="visually-hidden">{t.ordinal(s.rank)}</span>
              <span className={styles.info}>
                <span className={styles.name}>
                  {name}
                  {first && (
                    <span className={styles.crown} title={t.results.winner}>
                      <Icon name="crown" size={15} />
                    </span>
                  )}
                </span>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.fill} style={{ width: `${percent}%` }} />
                </span>
                <span className={styles.meta}>
                  <span>{t.percentOfMax(percent)}</span>
                  <span className="num">{t.ofMax(s.max)}</span>
                </span>
              </span>
              <span className={`${styles.score} ${first ? 'text-brand' : ''} num`}>{s.total}</span>
              <span className={`${styles.chevron} chevron`} aria-hidden="true">
                ›
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
