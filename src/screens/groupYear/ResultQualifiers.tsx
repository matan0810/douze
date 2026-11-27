import { useState } from 'react';
import { qualifierCount, type Semi } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { CountryChips } from '../../ui/CountryChips';
import styles from '../semi/SemiPanel.module.css';

interface Props {
  semi: Semi;
  /** A complete set of qualifiers, or null to clear it. */
  onSave: (qualifiers: string[] | null) => void;
}

/** A manager marks who qualified from a closed semi, by tapping the countries. */
export function ResultQualifiers({ semi, onSave }: Props) {
  const { t } = useI18n();
  const count = qualifierCount(semi.countries);
  const [draft, setDraft] = useState<string[] | null>(semi.qualifiers ? null : []);
  const shown = draft ?? semi.qualifiers ?? [];
  const toggle = (id: string) => {
    if (!draft) return;
    if (draft.includes(id)) setDraft(draft.filter((d) => d !== id));
    else if (draft.length < count) setDraft([...draft, id]);
  };
  const canSave = draft !== null && (draft.length === count || draft.length === 0);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className="section-label">{t.semi.qualifiers}</h2>
        {draft ? (
          <span className={`${styles.count} num`}>{t.semi.counted(draft.length, count)}</span>
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setDraft([...shown])}>
            {t.players.editFinalists}
          </button>
        )}
      </div>
      {draft && <p className={styles.hint}>{t.groupYear.qualifiersHint(count)}</p>}
      <CountryChips
        countries={semi.countries}
        state={(id) => (shown.includes(id) ? 'on' : 'off')}
        onTap={draft ? toggle : undefined}
      />
      {draft && (
        <div className={styles.actions}>
          {semi.qualifiers && (
            <button type="button" className="btn btn-line" onClick={() => setDraft(null)}>
              {t.cancel}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSave}
            onClick={() => {
              onSave(draft.length ? draft : null);
              setDraft(draft.length ? null : []);
            }}
          >
            {t.save}
          </button>
        </div>
      )}
    </section>
  );
}
