import type { Semi } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { CountryChips } from '../../ui/CountryChips';
import styles from './SemiPanel.module.css';

/**
 * Who qualified from the semi, lit: shown, never edited here. It comes from the archive, or
 * in a group from a manager (DESIGN.md, section 4).
 */
export function QualifiersPanel({ semi }: { semi: Semi }) {
  const { t } = useI18n();
  const qualified = semi.qualifiers ?? [];
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className="section-label">{t.semi.qualifiers}</h2>
      </div>
      {!semi.qualifiers && <p className={styles.hint}>{t.semi.noQualifiers}</p>}
      <CountryChips
        countries={semi.countries}
        state={(id) => (qualified.includes(id) ? 'on' : 'off')}
      />
    </section>
  );
}
