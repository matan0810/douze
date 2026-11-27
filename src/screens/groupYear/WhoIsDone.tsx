import type { Member } from '../../../shared/groups';
import type { StageView } from '../../../shared/years';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import styles from './GroupYear.module.css';

/** Every member, and whether their prediction of this stage is finished. */
export function WhoIsDone({ stage, members }: { stage: StageView; members: readonly Member[] }) {
  const { t } = useI18n();
  const done = new Set(stage.done);
  return (
    <section className={styles.section} aria-labelledby="who">
      <h2 id="who" className="section-label">
        {t.groupYear.who}
      </h2>
      <ul className={styles.who}>
        {members.map((m) => (
          <li key={m.id} className={done.has(m.id) ? styles.done : styles.waiting}>
            {done.has(m.id) && <Icon name="check" size={14} />}
            <span>{m.name}</span>
            <span className="visually-hidden">
              {done.has(m.id) ? t.groupYear.done : t.groupYear.waiting}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
