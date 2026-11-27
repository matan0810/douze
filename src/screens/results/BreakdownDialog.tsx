import { archive, countryById } from '../../domain/archive';
import type { Game } from '../../domain/game';
import { isComplete, scorePrediction } from '../../domain/scoring';
import { useI18n } from '../../i18n/context';
import { playerPieces } from '../../domain/pieces';
import { Dialog } from '../../ui/Dialog';
import { Token } from '../../ui/Token';
import { Flag } from '../../ui/Flag';
import { Icon } from '../../ui/Icon';
import { closeness } from './closeness';
import styles from './BreakdownDialog.module.css';

interface Props {
  game: Game;
  result: readonly string[];
  /** The player to show; nothing is open without one. */
  player: string | undefined;
  onClose: () => void;
}

/** One player's prediction against the result, country by country. */
export function BreakdownDialog({ game, result, player, onClose }: Props) {
  const { t, language } = useI18n();
  const found = game.players.find((p) => p.id === player);
  const valid = found && isComplete(found.order, game.finalists);
  const jokers = game.options.joker;
  const score = valid
    ? scorePrediction(found.id, found.order, result, jokers ? found.joker : undefined, jokers)
    : undefined;
  const name = found?.name[language] ?? '';
  const percent = score ? Math.round(score.share * 100) : 0;

  return (
    <Dialog
      open={!!score}
      wide
      onClose={onClose}
      label={name}
      header={
        score && (
          <>
            <div className={styles.who}>
              <Token
                name={name}
                piece={playerPieces(game, archive.players).get(found?.id ?? '') ?? 'violet'}
                size="lg"
              />
              <div>
                <h2 className={styles.name}>{name}</h2>
                <div className={styles.summary}>
                  <span className={`text-brand ${styles.total} num`}>{t.points(score.total)}</span>
                  <span>{t.accuracy(percent)}</span>
                </div>
              </div>
            </div>
            <div className={styles.stats}>
              {[
                { label: t.breakdown.exactHits, value: score.exact, tone: styles.good },
                {
                  label: t.breakdown.bonus,
                  value: score.rows.reduce((s, r) => s + r.bonus, 0),
                  tone: styles.near,
                },
                {
                  label: t.breakdown.base,
                  value: score.rows.reduce((s, r) => s + r.base, 0),
                  tone: styles.lilac,
                },
              ].map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <div className={`${styles.value} ${stat.tone} num`}>{stat.value}</div>
                  <div className={styles.label}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        )
      }
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t.close}
        </button>
      }
    >
      {score && (
        <>
          <ul className={styles.legend}>
            <li>
              <i className={styles.exact} />
              {t.breakdown.legendExact}
            </li>
            <li>
              <i className={styles.near} />
              {t.breakdown.legendNear}
            </li>
            <li>
              <i className={styles.off} />
              {t.breakdown.legendOff}
            </li>
            <li>
              <i className={styles.far} />
              {t.breakdown.legendFar}
            </li>
          </ul>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th className={styles.countryCell}>{t.breakdown.country}</th>
                <th>{t.breakdown.actual}</th>
                <th>{t.breakdown.predicted}</th>
                <th className={styles.end}>{t.breakdown.points}</th>
              </tr>
            </thead>
            <tbody>
              {score.rows.map((row, i) => {
                const tone = closeness(row.off);
                return (
                  <tr key={row.country} className={`${styles.row} ${styles[`${tone}Row`]}`}>
                    <td className={styles.index}>{i + 1}</td>
                    <td className={styles.countryCell}>
                      <span className={styles.country}>
                        <Flag country={countryById.get(row.country)} size="sm" />
                        {countryById.get(row.country)?.name[language]}
                      </span>
                    </td>
                    <td className="num">{row.actual}</td>
                    <td className={`${styles[tone]} num`}>{row.predicted}</td>
                    <td className={styles.end}>
                      <span className={`${styles.points} ${styles[`${tone}Points`]} num`}>
                        {row.points}
                      </span>
                      {row.joker && (
                        <span className={styles.joker} title={t.settings.joker}>
                          <Icon name="joker" size={12} />
                          ×2
                        </span>
                      )}
                      {row.bonus > 0 && (
                        <span className={styles.bonus}>
                          <bdi>+{row.bonus}</bdi>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </Dialog>
  );
}
