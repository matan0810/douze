import { useState } from 'react';
import { countryById } from '../../domain/archive';
import { setFinalists, type Game } from '../../domain/game';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Dialog } from '../../ui/Dialog';
import { FinalistsChooser } from '../../ui/FinalistsChooser';
import { Flag } from '../../ui/Flag';
import styles from './FinalistsPanel.module.css';

/** The countries in the final, a way to change them, and a way back to the archive. */
export function FinalistsPanel({ game }: { game: Game }) {
  const { t, language } = useI18n();
  const { update, edited, reset } = useGames();
  const [choosing, setChoosing] = useState<string[] | null>(null);

  return (
    <div className={styles.stack}>
      <section className={`${styles.panel} glass`}>
        <div className={styles.head}>
          <h2 className="section-label">{t.players.finalistsTitle(game.finalists.length)}</h2>
          <button
            type="button"
            className={styles.edit}
            onClick={() => setChoosing([...game.finalists])}
          >
            {t.players.editFinalists}
          </button>
        </div>
        {game.finalists.length === 0 ? (
          <p className="empty">{t.players.noFinalists}</p>
        ) : (
          <ul className={styles.list}>
            {game.finalists.map((id) => {
              const country = countryById.get(id);
              return (
                <li key={id} className={styles.item}>
                  <Flag country={country} size="md" />
                  <span className={styles.name}>{country?.name[language]}</span>
                  <span className={styles.other}>
                    {language === 'he' ? country?.name.en : country?.name.he}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {edited(game.year) && (
        <section className={`${styles.panel} ${styles.reset} glass`}>
          <h2 className="section-label">{t.players.resetTitle}</h2>
          <p>{t.players.resetText}</p>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(t.players.confirmReset)) reset(game.year);
            }}
          >
            {t.players.reset}
          </button>
        </section>
      )}

      {choosing && (
        <Dialog
          open
          wide
          onClose={() => setChoosing(null)}
          label={t.players.chooseFinalists}
          header={<h2 className={styles.dialogTitle}>{t.players.chooseFinalists}</h2>}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setChoosing(null)}>
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={choosing.length < 2}
                onClick={() => {
                  update(game.year, (g) => setFinalists(g, choosing));
                  setChoosing(null);
                }}
              >
                {t.save}
              </button>
            </>
          }
        >
          <FinalistsChooser chosen={choosing} onChange={setChoosing} />
        </Dialog>
      )}
    </div>
  );
}
