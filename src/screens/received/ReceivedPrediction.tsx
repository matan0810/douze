import { emptyGame, receivePrediction, sameName, setFinalists } from '../../domain/game';
import type { SharedPrediction } from '../../domain/links';
import { isComplete } from '../../domain/scoring';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { useGame, useGames } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { RankingDisplay } from '../../ui/RankingDisplay';
import styles from './ReceivedScreen.module.css';

/** A friend's prediction: shown, then added to this device's final in one tap. */
export function ReceivedPrediction({ year, shared }: { year: number; shared: SharedPrediction }) {
  const { t } = useI18n();
  const { put } = useGames();
  const game = useGame(year) ?? emptyGame(year);
  const fits = isComplete(shared.order, game.finalists);
  const existing = game.players.find((p) => sameName(p.name, shared.name));

  const keep = (useTheirField: boolean) => {
    const base = useTheirField ? setFinalists(game, [...shared.order].sort()) : game;
    put(receivePrediction(base, shared.name, shared.order));
    navigate({ name: 'final', year, view: 'players' });
  };

  return (
    <>
      <PageTitle
        start={t.received.predictionTitle(shared.name)}
        end=""
        tone="purple"
        lead={t.received.predictionLead(year)}
      />
      <div className={`${styles.panel} glass-purple panel`}>
        <div className={styles.actions}>
          {fits ? (
            <button type="button" className="btn btn-primary" onClick={() => keep(false)}>
              {existing ? t.received.replace(shared.name) : t.received.add}
            </button>
          ) : (
            <>
              <p className="note note-warn">{t.received.mismatch}</p>
              {!game.players.length && (
                <button type="button" className="btn btn-primary" onClick={() => keep(true)}>
                  {t.received.useField}
                </button>
              )}
            </>
          )}
        </div>
        <RankingDisplay order={shared.order} />
      </div>
    </>
  );
}
