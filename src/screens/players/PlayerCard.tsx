import type { Game, GamePlayer } from '../../domain/game';
import type { Piece } from '../../domain/pieces';
import { routeHash, semiView } from '../../domain/routes';
import { isComplete } from '../../domain/scoring';
import { isCompletePick } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import styles from './PlayerCard.module.css';

interface Props {
  game: Game;
  player: GamePlayer;
  piece: Piece;
  onEdit: () => void;
  onDelete: () => void;
}

/** A player: their name, how far their prediction is, and what can be done with it. */
export function PlayerCard({ game, player, piece, onEdit, onDelete }: Props) {
  const { t, language } = useI18n();
  const total = game.finalists.length;
  const count = player.order.length;
  const complete = total > 0 && isComplete(player.order, game.finalists);
  const name = player.name[language];

  return (
    <li className={`${styles.row} rise`} style={pieceColour(piece)}>
      <Token name={name} piece={piece} />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.status} ${complete ? styles.complete : ''} num`}>
          {complete && <Icon name="check" size={13} />}
          {complete ? t.players.complete : count > 0 ? `${count}/${total}` : t.players.noPrediction}
        </span>
        {game.semis.length > 0 && (
          <span className={styles.stages}>
            {game.semis.map((semi, i) => {
              const pick = semi.predictions.find((p) => p.player === player.id);
              const done = !!pick && isCompletePick(pick, semi);
              return (
                <a
                  key={i}
                  href={routeHash({ name: 'final', year: game.year, view: semiView(i) })}
                  className={done ? `${styles.stage} ${styles.done}` : styles.stage}
                >
                  {done && <Icon name="check" size={11} />}
                  {t.semi.chip(i + 1)}
                </a>
              );
            })}
          </span>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className="btn btn-line" onClick={onEdit} disabled={!total}>
          <Icon name="edit" size={15} />
          {complete ? t.players.editPrediction : t.players.predict}
        </button>
        <button
          type="button"
          className={styles.delete}
          aria-label={t.players.deletePlayer(name)}
          title={t.players.deletePlayer(name)}
          onClick={onDelete}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
      {total > 0 && (
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ width: `${(count / total) * 100}%` }} />
        </span>
      )}
    </li>
  );
}
