import type { Route } from '../domain/routes';
import { routeHash } from '../domain/routes';
import { useI18n } from '../i18n/context';
import { Icon, type IconName } from '../ui/Icon';
import { Wordmark } from '../ui/Wordmark';
import styles from './NavBar.module.css';

interface Props {
  route: Route;
  /** The final the year-bound links lead to. */
  year: number;
}

/** The bar on top of every page: the name, the screens, the language. */
export function NavBar({ route, year }: Props) {
  const { t, language, setLanguage } = useI18n();
  const view = route.name === 'final' ? route.view : route.name === 'player' ? 'table' : null;
  const links: { icon: IconName; label: string; hash: string; on: boolean; home?: true }[] = [
    { icon: 'home', label: t.nav.home, hash: '#/', on: route.name === 'home', home: true },
    {
      icon: 'players',
      label: t.nav.players,
      hash: routeHash({ name: 'final', year, view: 'players' }),
      on: view === 'players',
    },
    {
      icon: 'results',
      label: t.nav.results,
      hash: routeHash({ name: 'final', year, view: 'table' }),
      on: view === 'table' || view === 'results',
    },
    {
      icon: 'stats',
      label: t.nav.stats,
      hash: routeHash({ name: 'final', year, view: 'stats' }),
      on: view === 'stats',
    },
    { icon: 'history', label: t.nav.history, hash: '#/history', on: route.name === 'history' },
  ];

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <a
          href="#/"
          className={styles.brand}
          aria-current={route.name === 'home' ? 'page' : undefined}
        >
          <Wordmark size="bar" />
          <span className={styles.year}>{year}</span>
        </a>
        <nav className={styles.links} aria-label={t.nav.label}>
          {links.map((link) => (
            <a
              key={link.hash}
              href={link.hash}
              className={[styles.link, link.on && styles.on, link.home && styles.home]
                .filter(Boolean)
                .join(' ')}
              aria-current={link.on ? 'page' : undefined}
              aria-label={link.label}
              title={link.label}
            >
              <Icon name={link.icon} size={17} />
              <span className={styles.label} aria-hidden="true">
                {link.label}
              </span>
            </a>
          ))}
        </nav>
        <button
          type="button"
          className={styles.language}
          aria-label={t.switchLanguageLabel}
          onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
        >
          {t.switchLanguage}
        </button>
      </div>
    </header>
  );
}
