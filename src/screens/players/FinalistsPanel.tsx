import { countryById } from '../../domain/archive';
import type { Game } from '../../domain/game';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { Flag } from '../../ui/Flag';
import styles from './FinalistsPanel.module.css';

/** The countries in the final, and the way to the settings where they are changed. */
export function FinalistsPanel({ game }: { game: Game }) {
  const { t, language } = useI18n();
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className="section-label">{t.players.finalistsTitle(game.finalists.length)}</h2>
        <a
          className={styles.edit}
          href={routeHash({ name: 'final', year: game.year, view: 'settings' })}
        >
          {t.settings.editInSettings}
        </a>
      </div>
      {game.finalists.length === 0 ? (
        <p className="empty">{t.players.noFinalists}</p>
      ) : (
        <ul className={styles.list}>
          {game.finalists.map((id) => {
            const country = countryById.get(id);
            return (
              <li key={id} className={styles.item}>
                <Flag country={country} size="md" />
                <span className={styles.name}>{country?.name[language]}</span>
                <span className={styles.other}>
                  {language === 'he' ? country?.name.en : country?.name.he}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
