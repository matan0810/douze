import { routeHash } from '../../domain/routes';
import type { Standing } from '../../domain/scoring';
import { useI18n } from '../../i18n/context';
import { Avatar } from '../../ui/Avatar';
import styles from './Leaderboard.module.css';

interface Props {
  year: number;
  table: Standing[];
  names: ReadonlyMap<string, string>;
}

const PODIUM = [
  { tone: styles.first, avatar: 'gold', medal: '👑' },
  { tone: styles.second, avatar: 'silver', medal: '🥈' },
  { tone: styles.third, avatar: 'bronze', medal: '🥉' },
] as const;

/** Every scored player, best first: medal, initial, points and a bar against the maximum. */
export function Leaderboard({ year, table, names }: Props) {
  const { t } = useI18n();
  return (
    <ol className={styles.list}>
      {table.map((s, i) => {
        const podium = PODIUM[s.rank - 1];
        const name = names.get(s.player) ?? s.player;
        const percent = Math.round(s.share * 100);
        return (
          <li key={s.player} className="rise" style={{ animationDelay: `${i * 0.08}s` }}>
            <a
              href={routeHash({ name: 'player', year, id: s.player })}
              className={`${styles.row} ${podium ? podium.tone : `${styles.rest} glass`}`}
            >
              <span className={styles.rank}>
                {podium ? (
                  <>
                    <span className={styles.medal} aria-hidden="true">
                      {podium.medal}
                    </span>
                    {s.rank === 1 && <span className={styles.winner}>{t.results.winner}</span>}
                  </>
                ) : (
                  <span className="num">#{s.rank}</span>
                )}
                <span className="visually-hidden">{t.ordinal(s.rank)}</span>
              </span>
              <Avatar name={name} tone={podium?.avatar ?? 'action'} />
              <span className={styles.info}>
                <span className={styles.top}>
                  <span className={styles.name}>
                    {name}
                    {s.rank === 1 && ' 👑'}
                  </span>
                  <span className={`${styles.score} num`}>{s.total}</span>
                </span>
                <span className={styles.track}>
                  <span className={styles.fill} style={{ width: `${percent}%` }} />
                </span>
                <span className={styles.meta}>
                  <span>{t.percentOfMax(percent)}</span>
                  <span className="num">{t.ofMax(s.max)}</span>
                </span>
              </span>
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
