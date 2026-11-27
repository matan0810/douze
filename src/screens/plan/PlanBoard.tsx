import { useState } from 'react';
import { countryById } from '../../domain/archive';
import { setOrder, type Game, type GamePlayer } from '../../domain/game';
import type { Piece } from '../../domain/pieces';
import {
  DRAWERS,
  emptyPlan,
  nextSong,
  parsePlan,
  place,
  planOrder,
  planRanking,
  undo,
  type Drawer,
} from '../../domain/plan';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { useGames } from '../../state/context';
import { Flag } from '../../ui/Flag';
import { pieceColour } from '../../ui/pieceColour';
import { DrawerList } from './DrawerList';
import styles from './PlanScreen.module.css';

/** Where a plan in progress is kept on this device, one per final and player. */
export const PLAN_PREFIX = 'eurorank:plan:';

interface Props {
  game: Game;
  player: GamePlayer;
  piece: Piece;
  onDone: () => void;
}

/** One player's plan: the song on stage, its drawer, its place there, and the drawers so far. */
export function PlanBoard({ game, player, piece, onDone }: Props) {
  const { t, language } = useI18n();
  const { update } = useGames();
  const [plan, setPlan] = useLocalStorage(
    `${PLAN_PREFIX}${game.year}:${player.id}`,
    emptyPlan(),
    (value) => parsePlan(value, game.finalists),
  );
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const order = planOrder(game);
  const song = nextSong(plan, order);
  const country = song ? countryById.get(song) : undefined;
  const name = player.name[language];

  const put = (into: Drawer, index: number) => {
    if (!song) return;
    setPlan(place(plan, song, into, index));
    setDrawer(null);
  };
  const choose = (into: Drawer) => (plan.drawers[into].length ? setDrawer(into) : put(into, 0));

  return (
    <div className={styles.board} style={pieceColour(piece)}>
      {game.runningOrder.length < game.finalists.length && (
        <p className="note note-info">{t.plan.noRunningOrder}</p>
      )}
      {song ? (
        <section className={`piece-card ${styles.stage}`} aria-live="polite">
          <span className="eyebrow">{t.plan.onStage}</span>
          <span className={styles.song}>
            <Flag country={country} size="xl" />
            <strong>{country?.name[language] ?? song}</strong>
          </span>
          <span className={`${styles.count} num`}>
            {t.plan.song(plan.placed.length + 1, order.length)}
          </span>
          {drawer ? (
            <DrawerList
              title={`${t.plan.chooseSlot} · ${t.plan.drawer[drawer]}`}
              songs={plan.drawers[drawer]}
              onSlot={(index) => put(drawer, index)}
              onBack={() => setDrawer(null)}
            />
          ) : (
            <>
              <h2 className="section-label">{t.plan.chooseDrawer}</h2>
              <div className={styles.drawerButtons}>
                {DRAWERS.map((d) => (
                  <button key={d} type="button" className="btn btn-line" onClick={() => choose(d)}>
                    {t.plan.drawer[d]}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className={`piece-card ${styles.stage}`}>
          <p>{t.plan.allPlaced}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              update(game.year, (g) => setOrder(g, player.id, planRanking(plan)));
              setPlan(emptyPlan());
              navigate({ name: 'final', year: game.year, view: 'players' });
            }}
          >
            {t.plan.save(name)}
          </button>
        </section>
      )}

      <section className={styles.drawers}>
        {DRAWERS.map((d) => (
          <div key={d} className={styles.drawer}>
            <h3 className={styles.drawerTitle}>
              {t.plan.drawer[d]} <span className="num">({plan.drawers[d].length})</span>
            </h3>
            {plan.drawers[d].length ? (
              <ol className={styles.chips}>
                {plan.drawers[d].map((id) => (
                  <li key={id} className={styles.chip}>
                    <Flag country={countryById.get(id)} size="sm" />
                    {countryById.get(id)?.name[language] ?? id}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>{t.plan.empty}</p>
            )}
          </div>
        ))}
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-line"
          disabled={!plan.placed.length}
          onClick={() => setPlan(undo(plan))}
        >
          {t.plan.undo}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          disabled={!plan.placed.length}
          onClick={() => {
            if (window.confirm(t.plan.confirmRestart)) setPlan(emptyPlan());
          }}
        >
          {t.plan.restart}
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          {t.plan.who}
        </button>
      </div>
    </div>
  );
}
