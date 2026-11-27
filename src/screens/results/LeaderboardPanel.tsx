import { routeHash } from '../../domain/routes';
import { archive } from '../../domain/archive';
import { badges } from '../../domain/badges';
import type { Game } from '../../domain/game';
import { playerPieces } from '../../domain/pieces';
import type { Standing } from '../../domain/scoring';
import { downloadBlob, fileName, canShareFiles, shareFile } from '../../export/download';
import { drawShareImage } from '../../export/shareImage';
import { useI18n } from '../../i18n/context';
import { Facets } from '../../ui/Facets';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toastContext';
import { Leaderboard } from './Leaderboard';
import styles from './LeaderboardPanel.module.css';

interface Props {
  game: Game;
  table: Standing[];
  /** The table follows an order still being entered. */
  live: boolean;
}

/** The leaderboard in its panel, with the image to share it. */
export function LeaderboardPanel({ game, table, live }: Props) {
  const { t, language } = useI18n();
  const toast = useToast();
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));
  const pieces = playerPieces(game, archive.players);
  const given = live ? new Map() : badges(game);

  const shareImage = async () => {
    const title = t.results.imageTitle(game.year);
    const blob = await drawShareImage({ title, table, names, pieces, t });
    if (!blob) return toast(t.shareFailed);
    // ASCII only: some browsers save a Hebrew name as "download".
    const file = fileName(`eurorank-${game.year}`, 'png');
    if (canShareFiles() && (await shareFile(blob, file, title))) return;
    downloadBlob(blob, file);
  };

  return (
    <section className={`${styles.panel} rise`} aria-labelledby="board-title">
      <div className={styles.head}>
        <div>
          <h2 id="board-title" className={styles.title}>
            {t.results.leaderboard}
            {live && (
              <span className={styles.live}>
                <span className={styles.dot} aria-hidden="true" />
                {t.results.liveBadge}
              </span>
            )}
          </h2>
          <p className={styles.hint}>{t.results.clickPlayer}</p>
        </div>
        {!live && table.length > 0 && (
          <div className={styles.actions}>
            <a
              className="btn btn-line"
              href={routeHash({ name: 'final', year: game.year, view: 'reveal' })}
            >
              <Icon name="crown" size={15} />
              {t.reveal.open}
            </a>
            <button type="button" className="btn btn-line" onClick={shareImage}>
              <Icon name="image" size={15} />
              {t.results.shareImage}
            </button>
          </div>
        )}
      </div>
      <div className={styles.body}>
        {table.length ? (
          <>
            <Leaderboard
              year={game.year}
              table={table}
              names={names}
              pieces={pieces}
              badges={given}
              live={live}
            />
            {!live && <Facets delayMs={table.length * 350 + 300} />}
          </>
        ) : (
          <div className="empty">
            <div className={styles.trophy}>
              <Icon name="results" size={32} />
            </div>
            <p>{t.results.noScores}</p>
            <p className={styles.small}>{t.results.noScoresHint(game.finalists.length)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
