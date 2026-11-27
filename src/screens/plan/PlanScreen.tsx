import { useState } from 'react';
import { archive } from '../../domain/archive';
import { playerPieces } from '../../domain/pieces';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { pieceColour } from '../../ui/pieceColour';
import { Token } from '../../ui/Token';
import { YearSelect } from '../../ui/YearSelect';
import { PlanBoard } from './PlanBoard';
import styles from './PlanScreen.module.css';

/** Planning mode: who is planning, then their drawers, song by song in the running order. */
export function PlanScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const game = useGame(year);
  const [who, setWho] = useState<string | null>(null);
  if (!game) return null;
  const pieces = playerPieces(game, archive.players);
  const player = game.players.find((p) => p.id === who);

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.plan(year)}
        start={t.plan.titleStart}
        end={t.plan.titleEnd}
        lead={t.plan.lead}
        aside={<YearSelect year={year} view="plan" />}
      />
      {!game.finalists.length ? (
        <p className="empty frame">{t.players.noFinalists}</p>
      ) : player ? (
        <PlanBoard
          key={player.id}
          game={game}
          player={player}
          piece={pieces.get(player.id) ?? 'violet'}
          onDone={() => setWho(null)}
        />
      ) : (
        <section className={styles.who}>
          <h2 className="section-label">{t.plan.who}</h2>
          {game.players.length === 0 ? (
            <p className="empty">{t.players.empty}</p>
          ) : (
            <ul className={styles.players}>
              {game.players.map((p) => {
                const piece = pieces.get(p.id) ?? 'violet';
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`piece-card ${styles.player}`}
                      style={pieceColour(piece)}
                      onClick={() => setWho(p.id)}
                    >
                      <Token name={p.name[language]} piece={piece} />
                      {p.name[language]}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
