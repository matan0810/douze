import type { Game } from '../../domain/game';
import type { Standing } from '../../domain/scoring';
import { downloadBlob, fileName, canShareFiles, shareFile } from '../../export/download';
import { drawShareImage } from '../../export/shareImage';
import { useI18n } from '../../i18n/context';
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

  const shareImage = async () => {
    const title = t.results.imageTitle(game.year);
    const blob = await drawShareImage({ title, table, names, t });
    if (!blob) return toast(t.shareFailed);
    // ASCII only: some browsers save a Hebrew name as "download".
    const file = fileName(`eurorank-${game.year}`, 'png');
    if (canShareFiles() && (await shareFile(blob, file, title))) return;
    downloadBlob(blob, file);
  };

  return (
    <section className={`${styles.panel} glass panel rise`} aria-labelledby="board-title">
      <div className={styles.head}>
        <div>
          <h2 id="board-title" className={styles.title}>
            {t.results.leaderboard}
            {live && <span className={styles.live}>● {t.results.liveBadge}</span>}
          </h2>
          <p className={styles.hint}>{t.results.clickPlayer}</p>
        </div>
        {!live && table.length > 0 && (
          <button type="button" className="btn btn-soft" onClick={shareImage}>
            {t.results.shareImage}
          </button>
        )}
      </div>
      <div className={styles.body}>
        {table.length ? (
          <Leaderboard year={game.year} table={table} names={names} />
        ) : (
          <div className="empty">
            <div className={styles.trophy} aria-hidden="true">
              🏆
            </div>
            <p>{t.results.noScores}</p>
            <p className={styles.small}>{t.results.noScoresHint(game.finalists.length)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
