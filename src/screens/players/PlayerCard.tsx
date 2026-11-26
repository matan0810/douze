import type { Game, GamePlayer } from '../../domain/game';
import { isComplete } from '../../domain/scoring';
import { useI18n } from '../../i18n/context';
import { Avatar } from '../../ui/Avatar';
import styles from './PlayerCard.module.css';

interface Props {
  game: Game;
  player: GamePlayer;
  onEdit: () => void;
  onDelete: () => void;
}

/** A player: their initial, how far their prediction is, and what can be done with it. */
export function PlayerCard({ game, player, onEdit, onDelete }: Props) {
  const { t, language } = useI18n();
  const total = game.finalists.length;
  const count = player.order.length;
  const complete = total > 0 && isComplete(player.order, game.finalists);
  const name = player.name[language];
  const status = complete ? styles.complete : count > 0 ? styles.partial : styles.none;

  return (
    <li className={`${styles.card} glass rise`}>
      <div className={styles.row}>
        <Avatar name={name} />
        <div className={styles.info}>
          <div className={styles.name}>{name}</div>
          <span className={`${styles.status} ${status} num`}>
            {complete
              ? t.players.complete
              : count > 0
                ? `${count}/${total}`
                : t.players.noPrediction}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-soft" onClick={onEdit} disabled={!total}>
            {complete ? t.players.editPrediction : t.players.predict}
          </button>
          <button
            type="button"
            className={`${styles.icon} ${styles.delete}`}
            aria-label={t.players.deletePlayer(name)}
            title={t.players.deletePlayer(name)}
            onClick={onDelete}
          >
            🗑
          </button>
        </div>
      </div>
      {total > 0 && (
        <div className={styles.track}>
          <div
            className={complete ? `${styles.fill} ${styles.fillDone}` : styles.fill}
            style={{ width: `${(count / total) * 100}%` }}
          />
        </div>
      )}
    </li>
  );
}
