import { archive } from '../../domain/archive';
import type { Game } from '../../domain/game';
import { encodeOrder, groupHash } from '../../domain/links';
import { routeHash } from '../../domain/routes';
import { useShare } from '../../hooks/useShare';
import { useI18n } from '../../i18n/context';
import styles from './InvitePanel.module.css';

/** Two links: one asking a friend for their prediction, one carrying the whole group. */
export function InvitePanel({ game }: { game: Game }) {
  const { t, language } = useI18n();
  const share = useShare();
  if (!game.finalists.length) return null;
  return (
    <section className={`${styles.panel} glass`} aria-labelledby="invite-title">
      <h2 id="invite-title" className="section-label">
        {t.players.inviteTitle}
      </h2>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.link}
          onClick={() =>
            share(
              routeHash({
                name: 'mine',
                year: game.year,
                field: encodeOrder(game.finalists, archive.countries),
              }),
              t.mine.lead(game.year),
            )
          }
        >
          <strong>{t.players.askLink}</strong>
          <span>{t.players.askLinkHint}</span>
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={() =>
            share(groupHash(game, language, archive.countries), t.received.groupTitle(game.year))
          }
        >
          <strong>{t.players.groupLink}</strong>
          <span>{t.players.groupLinkHint}</span>
        </button>
      </div>
    </section>
  );
}
