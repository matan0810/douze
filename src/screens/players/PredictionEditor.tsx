import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { CountryPicker } from '../../picker/CountryPicker';
import { Dialog } from '../../ui/Dialog';
import styles from './PredictionEditor.module.css';

interface Props {
  name: string;
  field: readonly string[];
  initial: readonly string[];
  onSave: (order: string[]) => void;
  onClose: () => void;
}

/** One player's prediction, built in a dialog; nothing changes until it is saved. */
export function PredictionEditor({ name, field, initial, onSave, onClose }: Props) {
  const { t } = useI18n();
  const [order, setOrder] = useState<string[]>(() => initial.filter((id) => field.includes(id)));
  const title = t.players.editorTitle(name);
  return (
    <Dialog
      open
      onClose={onClose}
      label={title}
      header={
        <>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.hint}>{t.players.editorHint}</p>
          <p className={`${styles.count} num`}>{t.players.counted(order.length, field.length)}</p>
        </>
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(order)}>
            {t.players.savePrediction}
          </button>
        </>
      }
    >
      <CountryPicker field={field} selected={order} onChange={setOrder} />
    </Dialog>
  );
}
