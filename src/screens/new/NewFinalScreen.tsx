import { useState } from 'react';
import { emptyGame, isYear, MAX_YEAR, MIN_YEAR, setFinalists } from '../../domain/game';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { FinalistsChooser } from '../../ui/FinalistsChooser';
import { PageTitle } from '../../ui/PageTitle';
import styles from './NewFinalScreen.module.css';

/** Starts the final of a new year on this device: its year and its countries. */
export function NewFinalScreen() {
  const { t } = useI18n();
  const { games, years, put } = useGames();
  const [year, setYear] = useState(() =>
    Math.max(new Date().getFullYear(), (years[0] ?? 2025) + 1),
  );
  const [chosen, setChosen] = useState<string[]>([]);
  const taken = games.has(year);
  const valid = isYear(year) && !taken && chosen.length >= 2;

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.newFinal}
        start={t.newFinal.titleStart}
        end={t.newFinal.titleEnd}
        lead={t.newFinal.lead}
      />
      <div className={styles.panel}>
        <label className={styles.year}>
          <span className="section-label">{t.newFinal.year}</span>
          <input
            className="input num"
            type="number"
            inputMode="numeric"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        {taken && <p className="note note-warn">{t.newFinal.exists}</p>}
        <FinalistsChooser chosen={chosen} onChange={setChosen} />
        {chosen.length < 2 && <p className="note note-info">{t.newFinal.needTwo}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!valid}
          onClick={() => {
            put(setFinalists(emptyGame(year), chosen));
            navigate({ name: 'final', year, view: 'players' });
          }}
        >
          {t.newFinal.create}
        </button>
      </div>
    </div>
  );
}
