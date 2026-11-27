import { archive } from '../../domain/archive';
import { routeHash } from '../../domain/routes';
import { careers, gameStandings } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Icon } from '../../ui/Icon';
import { PageTitle } from '../../ui/PageTitle';
import { PlaceBadge } from '../../ui/PlaceBadge';
import { Token } from '../../ui/Token';
import styles from './HistoryScreen.module.css';

/** Every final with its winner, and the all-time table across them. */
export function HistoryScreen() {
  const { t, language } = useI18n();
  const { games, years } = useGames();
  const finals = years.flatMap((y) => {
    const game = games.get(y);
    return game ? [game] : [];
  });
  const all = careers(finals);

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.history}
        start={t.history.titleStart}
        end={t.history.titleEnd}
        lead={t.history.lead}
      />

      <section className={styles.section} aria-labelledby="champions">
        <h2 id="champions" className={styles.heading}>
          <Icon name="crown" size={16} />
          {t.history.champions}
        </h2>
        <ul className={styles.years}>
          {finals.map((game) => {
            const top = gameStandings(game).filter((s) => s.rank === 1);
            const names = top.map(
              (s) => game.players.find((p) => p.id === s.player)?.name[language] ?? s.player,
            );
            return (
              <li key={game.year}>
                <a
                  className={styles.year}
                  href={routeHash({ name: 'final', year: game.year, view: 'table' })}
                >
                  <span className={`${styles.yearNumber} text-brand num`}>{game.year}</span>
                  <span className={styles.winner}>
                    {top[0] ? (
                      <>
                        <Icon name="crown" size={15} />
                        {t.history.winnerOf(names.join(' · '), top[0].total)}
                      </>
                    ) : (
                      t.history.noResult
                    )}
                  </span>
                  <span className={styles.open}>{t.history.open}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="all-time">
        <h2 id="all-time" className={styles.heading}>
          <Icon name="results" size={16} />
          {t.history.allTime}
        </h2>
        <p className={styles.hint}>{t.history.allTimeHint}</p>
        {all.length === 0 ? (
          <p className="empty">{t.history.empty}</p>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th className={styles.start}>{t.nav.players}</th>
                  <th>{t.history.titles}</th>
                  <th>{t.history.podiums}</th>
                  <th>{t.history.finals}</th>
                  <th>{t.history.average}</th>
                  <th>{t.history.best}</th>
                </tr>
              </thead>
              <tbody>
                {all.map((c, i) => (
                  <tr key={c.key}>
                    <td>
                      <PlaceBadge place={i + 1} />
                    </td>
                    <td className={styles.start}>
                      <span className={styles.who}>
                        <Token
                          name={c.name[language]}
                          piece={archive.players.find((p) => p.id === c.key)?.piece ?? 'violet'}
                          size="sm"
                        />
                        {c.name[language]}
                      </span>
                    </td>
                    <td className={`${styles.titles} num`}>
                      {c.titles > 0 && <Icon name="crown" size={14} />}
                      {c.titles}
                    </td>
                    <td className="num">{c.podiums}</td>
                    <td className="num">{c.finals}</td>
                    <td className="num">{Math.round(c.average * 100)}%</td>
                    <td className="num">{t.history.bestIn(c.best.total, c.best.year)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
