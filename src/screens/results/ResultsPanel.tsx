import type { Game } from '../../domain/game';
import { scoredPlayers } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { CountryPicker } from '../../picker/CountryPicker';
import { RankingDisplay } from '../../ui/RankingDisplay';
import styles from './ResultsPanel.module.css';

interface Props {
  game: Game;
  editing: boolean;
  live: boolean;
  draft: string[];
  onDraft: (next: string[]) => void;
  onEdit: () => void;
  onLive: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

/** The official order: shown, or built and saved, with live mode for the night itself. */
export function ResultsPanel(props: Props) {
  const { game, editing, live, draft } = props;
  const { t } = useI18n();
  const total = game.finalists.length;
  const canSave = draft.length === total;
  const anyComplete = scoredPlayers(game).length > 0;

  return (
    <section className={`${styles.panel} glass panel`}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h2>{t.results.official}</h2>
            {editing && !live && <span className={styles.badge}>{t.results.editing}</span>}
            {live && (
              <span className={`${styles.badge} ${styles.live}`}>● {t.results.liveBadge}</span>
            )}
          </div>
          <p className={styles.hint}>
            {live
              ? t.results.liveHint
              : editing
                ? t.results.editingHint(draft.length, total)
                : game.result
                  ? t.results.viewHint
                  : t.results.none}
          </p>
        </div>
        {!editing && game.result && (
          <button type="button" className="btn btn-soft" onClick={props.onEdit}>
            {t.results.editButton}
          </button>
        )}
      </div>

      <div className={styles.body}>
        {editing ? (
          <CountryPicker
            field={game.finalists}
            selected={draft}
            onChange={props.onDraft}
            emptyHint={t.results.pickerEmpty}
          />
        ) : game.result ? (
          <RankingDisplay order={game.result} />
        ) : (
          <p className="empty">{t.results.noneShort}</p>
        )}
      </div>

      <div className={styles.foot}>
        {!anyComplete && <p className="note note-warn">{t.results.noCompletePlayers}</p>}
        {editing ? (
          <>
            {!live && (
              <button type="button" className={`btn ${styles.liveButton}`} onClick={props.onLive}>
                {t.results.live}
              </button>
            )}
            {!canSave && <p className="note note-info">{t.results.needAll(total)}</p>}
            <div className={styles.buttons}>
              {(game.result || live) && (
                <button type="button" className="btn btn-ghost" onClick={props.onCancel}>
                  {t.cancel}
                </button>
              )}
              <button
                type="button"
                className="btn btn-gold"
                disabled={!canSave}
                onClick={props.onSave}
              >
                {t.results.saveResults}
              </button>
            </div>
            {game.result && (
              <button type="button" className="btn btn-danger" onClick={props.onReset}>
                {t.results.reset}
              </button>
            )}
          </>
        ) : (
          !game.result && (
            <button type="button" className="btn btn-gold" onClick={props.onEdit}>
              {t.results.start}
            </button>
          )
        )}
      </div>
    </section>
  );
}
