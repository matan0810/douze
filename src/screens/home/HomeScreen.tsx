import { maxScore } from '../../domain/scoring';
import { gameStandings } from '../../domain/stats';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Wordmark } from '../../ui/Wordmark';
import styles from './HomeScreen.module.css';

const SPARKS = ['✦', '⭐', '✦', '★', '✦', '⭐', '✦'];

/** The front page: the name, the way in to players and results, and how scoring works. */
export function HomeScreen() {
  const { t, language } = useI18n();
  const { games, years } = useGames();
  const year = years[0] ?? new Date().getFullYear();
  const game = games.get(year);
  const leader = game ? gameStandings(game)[0] : undefined;
  const leaderName = leader && game?.players.find((p) => p.id === leader.player)?.name;
  const size = game?.finalists.length || 25;
  const hash = (view: 'players' | 'table') => routeHash({ name: 'final', year, view });

  return (
    <div className={styles.page}>
      <section className={`${styles.hero} rise`}>
        <div className={styles.sparks} aria-hidden="true">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className={i % 2 ? styles.big : styles.small}
              style={{ animationDuration: `${2 + i * 0.3}s`, animationDelay: `${i * 0.2}s` }}
            >
              {s}
            </span>
          ))}
        </div>
        <h1 className={styles.title}>
          <Wordmark size="hero" />
        </h1>
        <div className={styles.divider}>
          <span className={styles.line} />
          <span className={styles.edition}>{t.eurovision(year)}</span>
          <span className={styles.line} />
        </div>
        <p className={styles.slogan}>{t.slogan}</p>
        <p className={styles.lead}>{t.heroLine}</p>
        {leader && leaderName && (
          <a href={hash('table')} className={`${styles.champion} glass-gold`}>
            <span aria-hidden="true">👑</span>
            <span>
              {t.final(year)}: <strong>{leaderName[language]}</strong> ·{' '}
              <span className="num">{t.points(leader.total)}</span>
            </span>
          </a>
        )}
      </section>

      <section className={`${styles.cards} rise`} style={{ animationDelay: '0.2s' }}>
        <a href={hash('players')} className={`${styles.card} glass`}>
          <span className={`${styles.icon} ${styles.iconPurple}`} aria-hidden="true">
            👥
          </span>
          <h2>{t.home.playersTitle}</h2>
          <p>{t.home.playersText}</p>
          <span className={`btn btn-primary ${styles.action}`}>{t.home.playersAction}</span>
        </a>
        <a href={hash('table')} className={`${styles.card} glass`}>
          <span className={`${styles.icon} ${styles.iconGold}`} aria-hidden="true">
            🏆
          </span>
          <h2>{t.home.resultsTitle}</h2>
          <p>{t.home.resultsText}</p>
          <span className={`btn btn-gold ${styles.action}`}>{t.home.resultsAction}</span>
        </a>
      </section>

      <section className={`${styles.scoring} glass fade`} style={{ animationDelay: '0.5s' }}>
        <h3 className={styles.scoringTitle}>✦ {t.home.scoringTitle} ✦</h3>
        <div className={styles.tiles}>
          {[
            { label: t.home.exact, pts: t.home.exactPts, tone: styles.good },
            { label: t.home.offByOne, pts: t.home.offByOnePts, tone: styles.near },
            { label: t.home.winnerBonus, pts: t.home.winnerBonusPts, tone: styles.gold },
            { label: t.home.maxScore, pts: t.points(maxScore(size)), tone: styles.lilac },
          ].map((tile) => (
            <div key={tile.label} className={`${styles.tile} glass`}>
              <div className={`${styles.pts} ${tile.tone}`}>
                <bdi>{tile.pts}</bdi>
              </div>
              <div className={styles.tileLabel}>{tile.label}</div>
            </div>
          ))}
        </div>
        <p className={styles.scoringNote}>{t.home.scoringNote}</p>
      </section>
    </div>
  );
}
