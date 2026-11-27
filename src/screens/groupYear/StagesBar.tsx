import type { Stage, StageView } from '../../../shared/years';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import styles from '../../ui/StageTabs.module.css';

interface Props {
  group: string;
  year: number;
  stages: readonly StageView[];
  current: Stage;
}

/** The stages of the group's year, each its own address; hidden when there is only the final. */
export function StagesBar({ group, year, stages, current }: Props) {
  const { t } = useI18n();
  if (stages.length < 2) return null;
  const label = (stage: Stage) =>
    stage === 'final' ? t.stage.final : t.stage.semi(stage === 'semi-1' ? 1 : 2);
  return (
    <nav className={styles.bar} aria-label={t.stage.label}>
      <ul className={styles.tabs}>
        {stages.map(({ stage }) => (
          <li key={stage}>
            <a
              href={routeHash({ name: 'groupYear', id: group, year, stage })}
              className={stage === current ? `${styles.tab} ${styles.on}` : styles.tab}
              aria-current={stage === current ? 'page' : undefined}
            >
              {label(stage)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
