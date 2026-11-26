import { useState } from 'react';
import { setResult } from '../../domain/game';
import { routeHash } from '../../domain/routes';
import { isComplete, standings } from '../../domain/scoring';
import { consensus, scoredPlayers } from '../../domain/stats';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { useGame, useGames } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { YearSelect } from '../../ui/YearSelect';
import { BreakdownDialog } from './BreakdownDialog';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ResultsPanel } from './ResultsPanel';
import styles from './ResultsScreen.module.css';

interface Props {
  year: number;
  /** Opens the result in edit mode (the `/results` address). */
  editing?: boolean;
  /** The player whose breakdown is open over the table. */
  open?: string;
}

/** The official result of a final and the leaderboard it makes. */
export function ResultsScreen({ year, editing: startEditing = false, open }: Props) {
  const { t } = useI18n();
  const { update } = useGames();
  const game = useGame(year);
  const [editing, setEditing] = useState(startEditing || !game?.result);
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => game?.result ?? []);
  if (!game) return null;

  if (!game.finalists.length)
    return (
      <div className={styles.page}>
        <PageTitle
          eyebrow={t.eyebrow.results(year)}
          start={t.results.titleStart}
          end={t.results.titleEnd}
          lead={t.results.lead}
        />
        <div className="empty frame">
          <p>{t.results.noFinalists}</p>
          <a className="btn btn-primary" href={routeHash({ name: 'final', year, view: 'players' })}>
            {t.results.toPlayers}
          </a>
        </div>
      </div>
    );

  const liveOrder = live && isComplete(draft, game.finalists) ? draft : null;
  const shown = editing ? liveOrder : game.result;
  const table = shown
    ? standings(
        scoredPlayers(game).map((p) => ({ player: p.id, order: p.order })),
        shown,
        game.finalists,
      )
    : [];
  const board = editing ? !!liveOrder : !!game.result;

  const startLive = () => {
    // The scoreboard starts where we expected it: the group's average prediction.
    if (!isComplete(draft, game.finalists)) setDraft(consensus(game).order);
    setLive(true);
  };

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.results(year)}
        start={t.results.titleStart}
        end={t.results.titleEnd}
        lead={t.results.lead}
        aside={<YearSelect year={year} view="table" />}
      />
      <div className={board ? styles.split : styles.single}>
        <ResultsPanel
          game={game}
          editing={editing}
          live={live}
          draft={draft}
          onDraft={setDraft}
          onEdit={() => {
            setDraft(game.result ?? []);
            setEditing(true);
          }}
          onLive={startLive}
          onSave={() => {
            update(year, (g) => setResult(g, draft));
            setEditing(false);
            setLive(false);
          }}
          onCancel={() => {
            setDraft(game.result ?? []);
            setEditing(false);
            setLive(false);
          }}
          onReset={() => {
            if (!window.confirm(t.results.confirmReset)) return;
            update(year, (g) => setResult(g, null));
            setDraft([]);
            setLive(false);
            setEditing(true);
          }}
        />
        {board && <LeaderboardPanel game={game} table={table} live={editing && live} />}
      </div>
      {game.result && (
        <BreakdownDialog
          game={game}
          result={game.result}
          player={open}
          onClose={() => navigate({ name: 'final', year, view: 'table' })}
        />
      )}
    </div>
  );
}
