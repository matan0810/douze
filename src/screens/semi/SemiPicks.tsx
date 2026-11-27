import type { Game } from '../../domain/game';
import type { Piece } from '../../domain/pieces';
import { isCompletePick, qualifierCount, type Semi } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { Icon } from '../../ui/Icon';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import styles from './SemiPanel.module.css';

interface Props {
  game: Game;
  semi: Semi;
  pieces: ReadonlyMap<string, Piece>;
  onPick: (player: string) => void;
}

/** Every player of the year and how far their pick for this semi is. */
export function SemiPicks({ game, semi, pieces, onPick }: Props) {
  const { t, language } = useI18n();
  const count = qualifierCount(semi.countries);
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className="section-label">{t.semi.picks}</h2>
      </div>
      {game.players.length === 0 ? (
        <p className="empty">{t.players.empty}</p>
      ) : (
        <ul className={styles.list}>
          {game.players.map((p) => {
            const pick = semi.predictions.find((o) => o.player === p.id);
            const complete = !!pick && isCompletePick(pick, semi);
            const name = p.name[language];
            const piece = pieces.get(p.id) ?? 'violet';
            return (
              <li key={p.id} className={styles.row} style={pieceColour(piece)}>
                <Token name={name} piece={piece} size="sm" />
                <span className={styles.name}>{name}</span>
                <span className={`${styles.status} ${complete ? styles.complete : ''} num`}>
                  {complete && <Icon name="check" size={13} />}
                  {complete
                    ? t.players.complete
                    : pick?.picks.length
                      ? t.semi.counted(pick.picks.length, count)
                      : t.players.noPrediction}
                </span>
                <button
                  type="button"
                  className="btn btn-line"
                  aria-label={`${t.semi.pick}: ${name}`}
                  onClick={() => onPick(p.id)}
                >
                  <Icon name="edit" size={15} />
                  {t.semi.pick}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
