import type { ReactNode } from 'react';
import styles from './PageTitle.module.css';

interface Props {
  start: string;
  end: string;
  tone: 'gold' | 'purple';
  lead: ReactNode;
  /** Controls beside the title, such as the year. */
  aside?: ReactNode;
}

/** A page's heading: its first word in a shimmering gradient, the rest in white. */
export function PageTitle({ start, end, tone, lead, aside }: Props) {
  return (
    <div className={`${styles.title} rise`}>
      <div className={styles.row}>
        <h1>
          <span className={tone === 'gold' ? 'text-gold' : 'text-purple'}>{start}</span>
          {end}
        </h1>
        {aside}
      </div>
      <p className={styles.lead}>{lead}</p>
    </div>
  );
}
