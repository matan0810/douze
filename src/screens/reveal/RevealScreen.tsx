import { useState } from 'react';
import { archive } from '../../domain/archive';
import { playerPieces } from '../../domain/pieces';
import { revealSteps } from '../../domain/reveal';
import { routeHash } from '../../domain/routes';
import { gameStandings } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { Facets } from '../../ui/Facets';
import { PageTitle } from '../../ui/PageTitle';
import { RevealCard } from './RevealCard';
import styles from './RevealScreen.module.css';

/**
 * The reveal ceremony: the table told from the last place to the first, one tap at a time,
 * with a drum roll before the first place and the ball's facets for the champion.
 */
export function RevealScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const game = useGame(year);
  const [shown, setShown] = useState(0);
  if (!game) return null;
  const table = gameStandings(game);
  const steps = revealSteps(table);
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));
  const pieces = playerPieces(game, archive.players);
  const done = shown >= steps.length;
  const last = shown === steps.length - 1;
  const nextRank = steps[shown]?.[0]?.rank ?? 1;
  const title = (
    <PageTitle
      eyebrow={t.eyebrow.reveal(year)}
      start={t.reveal.titleStart}
      end={t.reveal.titleEnd}
      lead={t.reveal.lead}
    />
  );

  if (!steps.length)
    return (
      <div className={styles.page}>
        {title}
        <p className="empty frame">{t.reveal.noResult}</p>
      </div>
    );

  return (
    <div className={styles.page}>
      {title}
      {done && (
        <p className={`${styles.douze} slapped`} dir="ltr">
          {t.reveal.douze}
        </p>
      )}
      <ol className={styles.list} aria-live="polite">
        {/* first place on top: the places fill from the bottom up */}
        {[...steps].reverse().map((step, i) => {
          const revealed = steps.length - 1 - i < shown;
          const rank = step[0]?.rank ?? 0;
          return revealed ? (
            step.map((s) => (
              <RevealCard
                key={s.player}
                standing={s}
                name={names.get(s.player) ?? s.player}
                piece={pieces.get(s.player) ?? 'violet'}
              />
            ))
          ) : (
            <li key={`hidden-${rank}`} className={styles.hidden}>
              <span className={`${styles.place} num`}>{String(rank).padStart(2, '0')}</span>
              <span className={styles.secret}>?</span>
            </li>
          );
        })}
      </ol>
      <div className={styles.bar}>
        {done ? (
          <>
            <button type="button" className="btn btn-line" onClick={() => setShown(0)}>
              {t.reveal.again}
            </button>
            <a className="btn btn-primary" href={routeHash({ name: 'final', year, view: 'table' })}>
              {t.reveal.toTable}
            </a>
          </>
        ) : (
          <button
            type="button"
            className={`btn btn-primary ${styles.next} ${last ? styles.drumroll : ''}`}
            onClick={() => setShown(shown + 1)}
          >
            {last ? t.reveal.drumroll : t.reveal.next(nextRank)}
          </button>
        )}
      </div>
      {done && <Facets delayMs={200} />}
    </div>
  );
}
