import { useState } from 'react';
import { setDate, setOptions, setRunningOrder, type Game } from '../../domain/game';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Switch } from '../../ui/Switch';
import { PredictionEditor } from '../players/PredictionEditor';
import styles from './SettingsScreen.module.css';

/** The year's game: what is switched on, the date of the final and its running order. */
export function GameSection({ game }: { game: Game }) {
  const { t } = useI18n();
  const { update } = useGames();
  const [ordering, setOrdering] = useState(false);
  const year = game.year;
  return (
    <section className={styles.section}>
      <h2 className="section-label">{t.settings.game}</h2>
      <div>
        {game.semis.length > 0 && (
          <Switch
            label={t.settings.season}
            hint={t.settings.seasonHint}
            on={game.options.season}
            onChange={(season) => update(year, (g) => setOptions(g, { season }))}
          />
        )}
        <Switch
          label={t.settings.joker}
          hint={t.settings.jokerHint}
          on={game.options.joker}
          onChange={(joker) => update(year, (g) => setOptions(g, { joker }))}
        />
        <label className={styles.field}>
          <span className={styles.text}>
            <span className={styles.label}>{t.settings.date}</span>
            <span className={styles.hint}>{t.settings.dateHint}</span>
          </span>
          <input
            type="date"
            className={`input ${styles.date}`}
            value={game.date ?? ''}
            onChange={(e) => update(year, (g) => setDate(g, e.target.value || null))}
          />
        </label>
        <div className={styles.field}>
          <span className={styles.text}>
            <span className={styles.label}>{t.settings.runningOrder}</span>
            <span className={styles.hint}>
              {t.settings.runningOrderHint} ·{' '}
              <span className="num">
                {game.runningOrder.length}/{game.finalists.length}
              </span>
            </span>
          </span>
          <button
            type="button"
            className="btn btn-line"
            disabled={!game.finalists.length}
            onClick={() => setOrdering(true)}
          >
            {t.players.editFinalists}
          </button>
        </div>
      </div>
      {ordering && (
        <PredictionEditor
          title={t.settings.runningOrderTitle}
          hint={t.settings.runningOrderEditorHint}
          saveLabel={t.settings.saveRunningOrder}
          field={game.finalists}
          initial={game.runningOrder}
          onSave={(order) => {
            update(year, (g) => setRunningOrder(g, order));
            setOrdering(false);
          }}
          onClose={() => setOrdering(false)}
        />
      )}
    </section>
  );
}
