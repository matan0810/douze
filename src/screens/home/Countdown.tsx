import { nextFinal, today } from '../../domain/countdown';
import { routeHash } from '../../domain/routes';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import styles from './Countdown.module.css';

/** The days left to the next final whose date is known: a big number, like a scoreboard. */
export function Countdown() {
  const { t } = useI18n();
  const { games } = useGames();
  const next = nextFinal(games.values(), today());
  if (!next) return null;
  const href = routeHash({ name: 'final', year: next.year, view: 'players' });
  return (
    <a href={href} className={`${styles.countdown} slapped`}>
      {next.days > 1 ? (
        <>
          <span className={`${styles.days} num`}>{next.days}</span>
          <span className={styles.label}>{t.home.countdown(next.year)}</span>
        </>
      ) : (
        <span className={styles.label}>
          {next.days === 1 ? t.home.countdownOne(next.year) : t.home.countdownTonight(next.year)}
        </span>
      )}
    </a>
  );
}
