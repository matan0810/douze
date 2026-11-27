import { routeHash, semiView, type FinalView } from '../domain/routes';
import { useI18n } from '../i18n/context';
import { Icon } from './Icon';
import styles from './StageTabs.module.css';

interface Props {
  year: number;
  /** How many semis the year has: with none, the final is the only stage and no tabs show. */
  semis: number;
  /** Whether the year has a season table. */
  season: boolean;
  view: FinalView;
}

/** The stages of a year's game: the final, each semi, and the season that adds them up. */
export function StageTabs({ year, semis, season, view }: Props) {
  const { t } = useI18n();
  const stages: { view: FinalView; label: string }[] = [
    { view: 'table', label: t.stage.final },
    ...Array.from({ length: semis }, (_, i) => ({ view: semiView(i), label: t.stage.semi(i + 1) })),
    ...(semis && season ? [{ view: 'season' as const, label: t.stage.season }] : []),
  ];
  const current = view === 'results' ? 'table' : view;
  return (
    <nav className={styles.bar} aria-label={t.stage.label}>
      <ul className={styles.tabs}>
        {semis > 0 &&
          stages.map((s) => (
            <li key={s.view}>
              <a
                href={routeHash({ name: 'final', year, view: s.view })}
                className={s.view === current ? `${styles.tab} ${styles.on}` : styles.tab}
                aria-current={s.view === current ? 'page' : undefined}
              >
                {s.label}
              </a>
            </li>
          ))}
      </ul>
      <a
        href={routeHash({ name: 'final', year, view: 'settings' })}
        className={styles.settings}
        aria-current={view === 'settings' ? 'page' : undefined}
      >
        <Icon name="settings" size={16} />
        {t.settings.open}
      </a>
    </nav>
  );
}
