import { useEffect, useState } from 'react';
import { can } from '../../../shared/capabilities';
import type { GroupView } from '../../../shared/groups';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { api } from '../../net/api';
import { Icon } from '../../ui/Icon';
import { PublishYear } from './PublishYear';
import styles from './Groups.module.css';

/** The years the group plays, each opening its predictions; a manager publishes a new one. */
export function YearsSection({ view }: { view: GroupView }) {
  const { t } = useI18n();
  const [years, setYears] = useState<number[] | null>(null);

  useEffect(() => {
    let live = true;
    void api.years(view.id).then((answer) => {
      if (live) setYears(answer.ok ? answer.value : []);
    });
    return () => {
      live = false;
    };
  }, [view.id]);

  return (
    <section className={styles.section} aria-labelledby="years">
      <h2 id="years" className="section-label">
        {t.groupYear.years}
      </h2>
      {years === null ? (
        <p className={styles.muted}>{t.group.loading}</p>
      ) : years.length === 0 ? (
        <p className="empty frame">{t.groupYear.noYears}</p>
      ) : (
        <ul className={styles.list}>
          {years.map((year) => (
            <li key={year}>
              <a
                className={styles.card}
                href={routeHash({ name: 'groupYear', id: view.id, year, stage: 'final' })}
              >
                <Icon name="history" size={18} />
                <span className={`${styles.name} num`}>{t.groupYear.yearLink(year)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {can(view.me.role, 'settings.write') && <PublishYear group={view.id} />}
    </section>
  );
}
