import { archive } from './domain/archive';
import { standings } from './domain/scoring';
import { useI18n } from './i18n/context';
import styles from './App.module.css';

/** The first screen while the site is rebuilt: the latest final's table. */
export function App() {
  const { t, language, setLanguage } = useI18n();
  const edition = archive.editions[0];
  const table = edition?.result
    ? standings(edition.predictions, edition.result, edition.finalists)
    : [];
  const name = (id: string) => archive.players.find((p) => p.id === id)?.name[language] ?? id;
  return (
    <>
      <header className={styles.header}>
        <span className={styles.brand}>{t.brand}</span>
        <span className={styles.version} title={t.version(__APP_VERSION__)}>
          v{__APP_VERSION__}
        </span>
        <button
          type="button"
          className={styles.language}
          aria-label={t.switchLanguageLabel}
          onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
        >
          {t.switchLanguage}
        </button>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t.heroTitle}</h1>
        <p className={styles.lead}>{t.heroLine}</p>
        <ol>
          {table.map((s) => (
            <li key={s.player}>
              {name(s.player)}: {t.points(s.total)}
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
