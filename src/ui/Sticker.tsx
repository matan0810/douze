import type { ReactNode } from 'react';
import styles from './Sticker.module.css';

interface Props {
  children: ReactNode;
  /** Gold for the champion; otherwise the colour of the player it belongs to (`--pc`). */
  tone?: 'gold' | 'piece';
  /** Seconds before it is slapped on. */
  delay?: number;
  title?: string;
}

/** A sticker of reward, slapped on at a slight angle. */
export function Sticker({ children, tone = 'piece', delay = 0, title }: Props) {
  return (
    <span
      className={`${styles.sticker} ${tone === 'gold' ? styles.gold : ''} slapped`}
      style={{ animationDelay: `${delay}s` }}
      title={title}
    >
      {children}
    </span>
  );
}
