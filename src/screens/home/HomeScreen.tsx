import { maxScore } from '../../domain/scoring';
import { gameStandings } from '../../domain/stats';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Icon, type IconName } from '../../ui/Icon';
import { Wordmark } from '../../ui/Wordmark';
import styles from './HomeScreen.module.css';

/** The front page: the name, the last winner, the way in, and how scoring works. */
export function HomeScreen() {
  const { t, language } = useI18n();
  const { games, years } = useGames();
  const year = years[0] ?? new Date().getFullYear();
  const game = games.get(year);
  const leader = game ? gameStandings(game)[0] : undefined;
  const leaderName = leader && game?.players.find((p) => p.id === leader.player)?.name;
  const size = game?.finalists.length || 25;
  const hash = (view: 'players' | 'table') => routeHash({ name: 'final', year, view });
  const ways: { icon: IconName; title: string; text: string; action: string; href: string }[] = [
    {
      icon: 'players',
      title: t.home.playersTitle,
      text: t.home.playersText,
      action: t.home.playersAction,
      href: hash('players'),
    },
    {
      icon: 'results',
      title: t.home.resultsTitle,
      text: t.home.resultsText,
      action: t.home.resultsAction,
      href: hash('table'),
    },
  ];

  return (
    <div className={styles.page}>
      <section className={`${styles.hero} rise`}>
        <span className={`eyebrow text-brand ${styles.eyebrow}`}>{t.eyebrow.home(year)}</span>
        <h1 className={styles.title}>
          <Wordmark size="hero" />
        </h1>
        <p className={styles.slogan}>{t.slogan}</p>
        <p className={styles.lead}>{t.heroLine}</p>
        {leader && leaderName && (
          <a href={hash('table')} className={styles.champion}>
            <Icon name="crown" size={16} />
            <span>
              {t.final(year)} · <strong>{leaderName[language]}</strong> ·{' '}
              <span className="num">{t.points(leader.total)}</span>
            </span>
          </a>
        )}
      </section>

      <section className={`${styles.ways} rise`} style={{ animationDelay: '0.15s' }}>
        {ways.map((way) => (
          <a key={way.href} href={way.href} className={styles.way}>
            <span className={styles.icon}>
              <Icon name={way.icon} size={26} />
            </span>
            <h2>{way.title}</h2>
            <p>{way.text}</p>
            <span className={`btn btn-primary ${styles.action}`}>{way.action}</span>
          </a>
        ))}
      </section>

      <section className={`${styles.scoring} fade`} style={{ animationDelay: '0.3s' }}>
        <h3 className="section-label">{t.home.scoringTitle}</h3>
        <dl className={styles.rules}>
          {[
            { label: t.home.exact, pts: t.home.exactPts },
            { label: t.home.offByOne, pts: t.home.offByOnePts },
            { label: t.home.winnerBonus, pts: t.home.winnerBonusPts },
            { label: t.home.maxScore, pts: t.points(maxScore(size)) },
          ].map((rule) => (
            <div key={rule.label} className={styles.rule}>
              <dt className={styles.pts}>
                <bdi>{rule.pts}</bdi>
              </dt>
              <dd>{rule.label}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>{t.home.scoringNote}</p>
      </section>
    </div>
  );
}
