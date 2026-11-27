import type { Game } from '../../domain/game';
import { scoredPlayers } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { RankingDisplay } from '../../ui/RankingDisplay';
import styles from './ResultsPanel.module.css';

/**
 * The official order, shown and never edited here: it comes from the archive, or, in a
 * group, from a manager (DESIGN.md, section 4).
 */
export function ResultsPanel({ game }: { game: Game }) {
  const { t } = useI18n();
  const anyComplete = scoredPlayers(game).length > 0;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <h2>{t.results.official}</h2>
          <p className={styles.hint}>{game.result ? t.results.viewHint : t.results.none}</p>
        </div>
      </div>
      <div className={styles.body}>
        {game.result ? (
          <RankingDisplay order={game.result} />
        ) : (
          <p className="empty">{t.results.noneShort}</p>
        )}
      </div>
      {!anyComplete && (
        <div className={styles.foot}>
          <p className="note note-warn">
            <Icon name="warn" size={14} />
            {t.results.noCompletePlayers}
          </p>
        </div>
      )}
    </section>
  );
}
