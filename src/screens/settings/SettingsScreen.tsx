import { useState } from 'react';
import { setFinalists, setSemiCount, setSemiCountries } from '../../domain/game';
import { MAX_SEMIS } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { useGame, useGames } from '../../state/context';
import { Dialog } from '../../ui/Dialog';
import { FinalistsChooser } from '../../ui/FinalistsChooser';
import { PageTitle } from '../../ui/PageTitle';
import { StageTabs } from '../../ui/StageTabs';
import { YearSelect } from '../../ui/YearSelect';
import { FieldSection } from './FieldSection';
import { GameSection } from './GameSection';
import styles from './SettingsScreen.module.css';

/** What is being chosen in the dialog: the final's field, or a semi's. */
type Choosing = { stage: 'final' } | { stage: 'semi'; index: number };

/**
 * A year's settings: the countries of the final and of each semi, set separately, since
 * the host and the big five reach the final without a semi; and the way back to the archive.
 */
export function SettingsScreen({ year }: { year: number }) {
  const { t } = useI18n();
  const { update, edited, reset } = useGames();
  const game = useGame(year);
  const [choosing, setChoosing] = useState<Choosing | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  if (!game) return null;

  const open = (what: Choosing, current: string[]) => {
    setChosen([...current]);
    setChoosing(what);
  };
  // A country is in one semi only: in the other semi's chooser it is taken.
  const taken = new Map<string, string>();
  if (choosing?.stage === 'semi')
    game.semis.forEach((semi, i) => {
      if (i !== choosing.index)
        semi.countries.forEach((id) => taken.set(id, t.settings.inOther(i + 1)));
    });
  const title =
    choosing?.stage === 'semi' ? t.settings.semiCountries(choosing.index + 1) : t.settings.final;

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.settings(year)}
        start={t.settings.titleStart}
        end={t.settings.titleEnd}
        lead={t.settings.lead}
        aside={<YearSelect year={year} view="settings" />}
      />
      <StageTabs
        year={year}
        semis={game.semis.length}
        season={game.options.season}
        view="settings"
      />

      <div className={styles.stack}>
        <FieldSection
          title={t.settings.final}
          countries={game.finalists}
          onEdit={() => open({ stage: 'final' }, game.finalists)}
        />

        <section className={styles.section}>
          <h2 className="section-label">{t.settings.semis}</h2>
          <div className={styles.count} role="group" aria-label={t.settings.semiCount}>
            <span className={styles.countLabel}>{t.settings.semiCount}</span>
            {Array.from({ length: MAX_SEMIS + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                className={
                  n === game.semis.length ? `${styles.option} ${styles.on}` : styles.option
                }
                aria-pressed={n === game.semis.length}
                onClick={() => {
                  const dropping = game.semis.slice(n).some((s) => s.countries.length);
                  if (dropping && !window.confirm(t.settings.confirmFewer)) return;
                  update(year, (g) => setSemiCount(g, n));
                }}
              >
                {n === 0 ? t.settings.none : n}
              </button>
            ))}
          </div>
        </section>

        {game.semis.map((semi, i) => (
          <FieldSection
            key={i}
            title={t.settings.semiCountries(i + 1)}
            countries={semi.countries}
            onEdit={() => open({ stage: 'semi', index: i }, semi.countries)}
          />
        ))}

        <GameSection game={game} />

        {edited(year) && (
          <section className={`${styles.section} ${styles.reset}`}>
            <h2 className="section-label">{t.players.resetTitle}</h2>
            <p>{t.players.resetText}</p>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                if (window.confirm(t.players.confirmReset)) reset(year);
              }}
            >
              {t.players.reset}
            </button>
          </section>
        )}
      </div>

      {choosing && (
        <Dialog
          open
          wide
          onClose={() => setChoosing(null)}
          label={title}
          header={<h2 className={styles.dialogTitle}>{title}</h2>}
          footer={
            <>
              <button type="button" className="btn btn-line" onClick={() => setChoosing(null)}>
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={choosing.stage === 'final' && chosen.length < 2}
                onClick={() => {
                  update(year, (g) =>
                    choosing.stage === 'final'
                      ? setFinalists(g, chosen)
                      : setSemiCountries(g, choosing.index, chosen),
                  );
                  setChoosing(null);
                }}
              >
                {t.save}
              </button>
            </>
          }
        >
          <FinalistsChooser
            chosen={chosen}
            onChange={setChosen}
            taken={taken}
            hint={choosing.stage === 'semi' ? t.settings.semiHint : undefined}
          />
        </Dialog>
      )}
    </div>
  );
}
