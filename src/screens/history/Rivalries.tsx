import { archive } from '../../domain/archive';
import type { Rivalry } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import page from './HistoryScreen.module.css';
import styles from './Rivalries.module.css';

/** Every pair of us across the years: who finished above whom, like a fixture's score. */
export function Rivalries({ rivalries }: { rivalries: Rivalry[] }) {
  const { t, language } = useI18n();
  const piece = (key: string) => archive.players.find((p) => p.id === key)?.piece ?? 'violet';
  if (!rivalries.length) return null;
  return (
    <section className={page.section} aria-labelledby="rivals">
      <h2 id="rivals" className={page.heading}>
        <Icon name="duel" size={16} />
        {t.history.rivals}
      </h2>
      <p className={page.hint}>{t.history.rivalsHint}</p>
      <ul className={styles.list}>
        {rivalries.map((r) => (
          <li key={`${r.a.key}|${r.b.key}`} className={styles.fixture}>
            <span className={styles.side} style={pieceColour(piece(r.a.key))}>
              <Token name={r.a.name[language]} piece={piece(r.a.key)} size="sm" />
              {r.a.name[language]}
            </span>
            {/* each number beside its player, in either reading direction */}
            <span className={`${styles.score} num`}>
              <span>{r.aWins}</span>
              <span aria-hidden="true">:</span>
              <span>{r.bWins}</span>
            </span>
            <span className={`${styles.side} ${styles.end}`} style={pieceColour(piece(r.b.key))}>
              {r.b.name[language]}
              <Token name={r.b.name[language]} piece={piece(r.b.key)} size="sm" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
