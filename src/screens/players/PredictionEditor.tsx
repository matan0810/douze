import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { CountryPicker } from '../../picker/CountryPicker';
import { Dialog } from '../../ui/Dialog';
import styles from './PredictionEditor.module.css';

interface Props {
  /** The dialog's title; the hint, the count and the button follow the prediction's unless set. */
  title: string;
  hint?: string;
  saveLabel?: string;
  field: readonly string[];
  initial: readonly string[];
  /** In a year with jokers, the player's joker so far. */
  jokers?: boolean;
  initialJoker?: string | null;
  onSave: (order: string[], joker: string | null) => void;
  onClose: () => void;
}

/** One player's prediction, built in a dialog; nothing changes until it is saved. */
export function PredictionEditor({
  title,
  hint,
  saveLabel,
  field,
  initial,
  jokers = false,
  initialJoker = null,
  onSave,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [order, setOrder] = useState<string[]>(() => initial.filter((id) => field.includes(id)));
  const [joker, setJoker] = useState<string | null>(initialJoker);
  return (
    <Dialog
      open
      onClose={onClose}
      label={title}
      header={
        <>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.hint}>{hint ?? t.players.editorHint}</p>
          <p className={`${styles.count} num`}>{t.players.counted(order.length, field.length)}</p>
        </>
      }
      footer={
        <>
          <button type="button" className="btn btn-line" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave(order, joker && order.includes(joker) ? joker : null)}
          >
            {saveLabel ?? t.players.savePrediction}
          </button>
        </>
      }
    >
      <CountryPicker
        field={field}
        selected={order}
        onChange={setOrder}
        joker={joker}
        onJoker={jokers ? setJoker : undefined}
      />
    </Dialog>
  );
}
