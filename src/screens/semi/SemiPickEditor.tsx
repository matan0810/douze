import { useState } from 'react';
import { countryName } from '../../domain/archive';
import { qualifierCount, type Semi, type SemiPick } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { CountryChips } from '../../ui/CountryChips';
import { Dialog } from '../../ui/Dialog';
import styles from './SemiPickEditor.module.css';

interface Props {
  title: string;
  semi: Semi;
  initial: SemiPick | undefined;
  onSave: (picks: string[], reserve: string | null) => void;
  onClose: () => void;
}

/**
 * A player's pick for a semi, by tapping: the first ten taps are the qualifiers, the next
 * is 11th place; tapping a chosen country takes it back. Nothing changes until saved.
 */
export function SemiPickEditor({ title, semi, initial, onSave, onClose }: Props) {
  const { t, language } = useI18n();
  const count = qualifierCount(semi.countries);
  const [picks, setPicks] = useState<string[]>(() => initial?.picks ?? []);
  const [reserve, setReserve] = useState<string | null>(() => initial?.reserve ?? null);
  const tap = (id: string) => {
    if (picks.includes(id)) setPicks(picks.filter((p) => p !== id));
    else if (reserve === id) setReserve(null);
    else if (picks.length < count) setPicks([...picks, id]);
    else setReserve(id);
  };
  return (
    <Dialog
      open
      wide
      onClose={onClose}
      label={title}
      header={
        <>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.hint}>{t.semi.pickHint(count)}</p>
          <p className={styles.counts}>
            <span className={`${styles.count} num`}>{t.semi.picked(picks.length, count)}</span>
            <span className={styles.reserve}>
              {t.semi.reserve}:{' '}
              <strong>{reserve ? countryName(reserve, language) : t.semi.reserveNone}</strong>
            </span>
          </p>
        </>
      }
      footer={
        <>
          <button type="button" className="btn btn-line" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(picks, reserve)}>
            {t.semi.savePick}
          </button>
        </>
      }
    >
      <CountryChips
        countries={semi.countries}
        state={(id) => (picks.includes(id) ? 'on' : reserve === id ? 'reserve' : 'off')}
        mark={(id) => (reserve === id ? '11' : undefined)}
        onTap={tap}
      />
    </Dialog>
  );
}
