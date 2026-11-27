import { useState } from 'react';
import {
  isCompleteEntry,
  isFinalEntry,
  qualifierCount,
  type Entry,
  type StageView,
} from '../../../shared/years';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { PredictionEditor } from '../players/PredictionEditor';
import { SemiPickEditor } from '../semi/SemiPickEditor';
import styles from './GroupYear.module.css';

interface Props {
  stage: StageView;
  me: string;
  onSave: (entry: Entry) => Promise<boolean>;
}

/** This member's own prediction of the stage: how far it is, and the editor until the lock. */
export function MyEntry({ stage, me, onSave }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const entry = stage.entries.find((e) => e.member === me)?.entry;
  const of = stage.stage === 'final' ? stage.countries.length : qualifierCount(stage.countries);
  const placed = entry ? (isFinalEntry(entry) ? entry.order.length : entry.picks.length) : 0;
  const status = !entry
    ? t.groupYear.notYet
    : isCompleteEntry(entry, stage.countries)
      ? t.groupYear.ready
      : t.groupYear.inProgress(placed, of);

  const save = async (next: Entry) => {
    if (await onSave(next)) setEditing(false);
  };

  return (
    <section className={styles.mine} aria-labelledby="mine">
      <div className={styles.mineHead}>
        <h2 id="mine" className="section-label">
          {t.groupYear.mine}
        </h2>
        <p className={styles.status}>{status}</p>
      </div>
      {!stage.locked && (
        <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} />
          {entry ? t.groupYear.edit : t.groupYear.enter}
        </button>
      )}
      {editing && stage.stage === 'final' && (
        <PredictionEditor
          title={t.groupYear.mine}
          field={stage.countries}
          initial={entry && isFinalEntry(entry) ? entry.order : []}
          jokers={stage.joker}
          initialJoker={entry && isFinalEntry(entry) ? entry.joker : null}
          onSave={(order, joker) => void save({ order, joker })}
          onClose={() => setEditing(false)}
        />
      )}
      {editing && stage.stage !== 'final' && (
        <SemiPickEditor
          title={t.groupYear.mine}
          semi={{ countries: stage.countries, qualifiers: null, predictions: [] }}
          initial={entry && !isFinalEntry(entry) ? { player: me, ...entry } : undefined}
          onSave={(picks, reserve) => void save({ picks, reserve })}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}
