import { archive } from '../../domain/archive';
import { seasonBadges } from '../../domain/badges';
import { playerPieces } from '../../domain/pieces';
import { seasonStandings } from '../../domain/season';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { pieceColour } from '../../ui/pieceColour';
import { StageStickers } from '../../ui/StageStickers';
import { StageTabs } from '../../ui/StageTabs';
import { Token } from '../../ui/Token';
import { YearSelect } from '../../ui/YearSelect';
import styles from './SeasonScreen.module.css';

const METALS = [styles.gold, styles.silver, styles.bronze];
const STEP = 0.3;

/** The season: the final and the semis added up, with the bonus of a perfect semi. */
export function SeasonScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const game = useGame(year);
  if (!game) return null;
  const rows = seasonStandings(game);
  const stickers = seasonBadges(rows);
  const pieces = playerPieces(game, archive.players);
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));
  const cell = (n: number | null) => (n === null ? '–' : String(n));

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.season(year)}
        start={t.season.titleStart}
        end={t.season.titleEnd}
        lead={t.season.lead}
        aside={<YearSelect year={year} view="season" />}
      />
      <StageTabs year={year} semis={game.semis.length} season={game.options.season} view="season" />
      {!game.options.season ? (
        <p className="empty frame">{t.settings.seasonOff}</p>
      ) : rows.length === 0 ? (
        <p className="empty frame">{t.season.none}</p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">{t.ordinal(1)}</span>
                </th>
                <th scope="col" className={styles.player}>
                  {t.season.player}
                </th>
                <th scope="col">{t.season.final}</th>
                {game.semis.map((_, i) => (
                  <th scope="col" key={i}>
                    {t.season.semi(i + 1)}
                  </th>
                ))}
                <th scope="col">{t.season.bonus}</th>
                <th scope="col" className={styles.total}>
                  {t.season.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const name = names.get(r.player) ?? r.player;
                const piece = pieces.get(r.player) ?? 'violet';
                return (
                  <tr
                    key={r.player}
                    className={r.rank === 1 ? `land ${styles.first}` : 'land'}
                    style={{
                      ...pieceColour(piece),
                      animationDelay: `${(rows.length - 1 - i) * STEP}s`,
                    }}
                  >
                    <td className={`${styles.place} ${METALS[r.rank - 1] ?? ''} num`}>
                      {String(r.rank).padStart(2, '0')}
                    </td>
                    <th scope="row" className={styles.player}>
                      <span className={styles.who}>
                        <Token name={name} piece={piece} size="sm" />
                        {name}
                        <StageStickers
                          badges={stickers.get(r.player) ?? []}
                          delay={(rows.length - i) * STEP + 0.4}
                        />
                      </span>
                    </th>
                    <td className="num">{cell(r.final)}</td>
                    {r.semis.map((s, j) => (
                      <td className="num" key={j}>
                        {cell(s)}
                      </td>
                    ))}
                    <td className={`num ${r.bonus ? styles.bonus : ''}`}>
                      {r.bonus ? `+${r.bonus}` : '–'}
                    </td>
                    <td className={`${styles.total} num`}>{r.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
