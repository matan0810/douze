import { useState } from 'react';
import type { StageView } from '../../../shared/years';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/toastContext';
import { PredictionEditor } from '../players/PredictionEditor';
import { ResultQualifiers } from './ResultQualifiers';
import styles from './GroupYear.module.css';

interface Props {
  stage: StageView;
  /** This phone's copy of the result, to start from (`knownResult`). */
  known: string[] | null;
  onSave: (result: string[] | null) => Promise<boolean>;
}

/**
 * A manager enters the official result of a closed stage, once; correcting it is there for
 * a mistake, not for following the night. Everyone else only sees it (the owner, 2026-11-28).
 */
export function ResultEntry({ stage, known, onSave }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  if (stage.stage !== 'final')
    return (
      <ResultQualifiers
        semi={{ countries: stage.countries, qualifiers: stage.result, predictions: [] }}
        onSave={(qualifiers) => void onSave(qualifiers)}
      />
    );

  const save = async (order: string[]) => {
    if (order.length !== stage.countries.length) return toast(t.groupYear.resultHint);
    if (await onSave(order)) setEditing(false);
  };
  return (
    <div className={styles.result}>
      <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
        <Icon name="results" size={16} />
        {stage.result ? t.groupYear.editResult : t.groupYear.enterResult}
      </button>
      {editing && (
        <PredictionEditor
          title={t.groupYear.resultTitle}
          hint={t.groupYear.resultHint}
          saveLabel={t.groupYear.saveResult}
          field={stage.countries}
          initial={stage.result ?? known ?? []}
          onSave={(order) => void save(order)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
