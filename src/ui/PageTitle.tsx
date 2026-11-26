import type { ReactNode } from 'react';
import styles from './PageTitle.module.css';

interface Props {
  /** The spaced Latin line above the title, the same in both languages. */
  eyebrow: string;
  start: string;
  end: string;
  lead: ReactNode;
  /** Controls beside the title, such as the year. */
  aside?: ReactNode;
}

/** A page's heading: an eyebrow, then a thin title whose first word catches the light. */
export function PageTitle({ eyebrow, start, end, lead, aside }: Props) {
  return (
    <div className={`${styles.title} rise`}>
      <span className={`eyebrow text-brand ${styles.eyebrow}`}>{eyebrow}</span>
      <div className={styles.row}>
        <h1>
          <span className="text-brand">{start}</span>
          {end}
        </h1>
        {aside}
      </div>
      <p className={styles.lead}>{lead}</p>
    </div>
  );
}
