import type { Badge } from '../../domain/badges';
import type { Piece } from '../../domain/pieces';
import { routeHash } from '../../domain/routes';
import type { Standing } from '../../domain/scoring';
import { useCountUp } from '../../hooks/useCountUp';
import { useI18n } from '../../i18n/context';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import { BadgeStickers } from './BadgeStickers';
import styles from './Leaderboard.module.css';

interface Props {
  year: number;
  table: Standing[];
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
  badges: ReadonlyMap<string, Badge[]>;
  /** Live mode: rows and points change as the order is dragged; no entrance. */
  live: boolean;
}

const METALS = [styles.gold, styles.silver, styles.bronze];
/** Seconds between rows landing: the last place first, the leader last, for suspense. */
const STEP = 0.35;

/**
 * The table as a game show's scoreboard: each player a rounded row in their colour, with
 * their token, their place as a large numeral (the first three in their metals), their
 * points counting up, and their stickers. The rows land from the last to the first.
 */
export function Leaderboard(props: Props) {
  return (
    <ol className={styles.list}>
      {props.table.map((s, i) => (
        <Row key={s.player} {...props} standing={s} landsAt={(props.table.length - 1 - i) * STEP} />
      ))}
    </ol>
  );
}

function Row({
  year,
  standing: s,
  names,
  pieces,
  badges,
  live,
  landsAt,
}: Props & { standing: Standing; landsAt: number }) {
  const { t } = useI18n();
  const name = names.get(s.player) ?? s.player;
  const percent = Math.round(s.share * 100);
  const first = s.rank === 1;
  const points = useCountUp(s.total, live ? 0 : (landsAt + 0.3) * 1000);
  const shown = live ? s.total : points;
  return (
    <li
      className={live ? undefined : 'land'}
      style={{ ...pieceColour(pieces.get(s.player) ?? 'violet'), animationDelay: `${landsAt}s` }}
    >
      <a
        href={routeHash({ name: 'player', year, id: s.player })}
        className={`${styles.row} piece-card ${first ? 'piece-card-first' : ''}`}
      >
        <span className={`${styles.place} ${METALS[s.rank - 1] ?? ''} num`} aria-hidden="true">
          {String(s.rank).padStart(2, '0')}
        </span>
        <span className="visually-hidden">{t.ordinal(s.rank)}</span>
        <Token name={name} piece={pieces.get(s.player) ?? 'violet'} />
        <span className={styles.info}>
          <span className={styles.name}>
            {name}
            <BadgeStickers
              badges={live ? [] : (badges.get(s.player) ?? [])}
              delay={landsAt + 0.6}
            />
          </span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${percent}%` }} />
          </span>
          <span className={styles.meta}>
            <span>{t.percentOfMax(percent)}</span>
            <span className="num">{t.ofMax(s.max)}</span>
          </span>
        </span>
        <span className={`${styles.score} num`} aria-label={String(s.total)}>
          {shown}
        </span>
        <span className={`${styles.chevron} chevron`} aria-hidden="true">
          ›
        </span>
      </a>
    </li>
  );
}
