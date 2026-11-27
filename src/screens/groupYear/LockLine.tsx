import type { StageView } from '../../../shared/years';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import styles from './GroupYear.module.css';

interface Props {
  stage: StageView;
  /** A manager may close the stage now. */
  onClose?: () => void;
}

/**
 * Whether predictions are still open: through the show, until the results are read and a
 * manager closes them, or until the stage closes by itself; or when they closed.
 */
export function LockLine({ stage, onClose }: Props) {
  const { t, language } = useI18n();
  const when = new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(stage.lockAt);
  if (stage.locked) return <p className={styles.lock}>{t.groupYear.closedAt(when)}</p>;
  return (
    <div className={`${styles.lock} ${styles.open}`}>
      <p>
        <strong>{t.groupYear.open}</strong> {t.groupYear.autoAt(when)}
      </p>
      {onClose && (
        <button type="button" className="btn btn-line" onClick={onClose}>
          <Icon name="check" size={16} />
          {t.groupYear.close}
        </button>
      )}
    </div>
  );
}
