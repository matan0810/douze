import { routeHash } from '../../domain/routes';
import { standings } from '../../domain/scoring';
import { scoringEntries } from '../../domain/stats';
import { navigate } from '../../hooks/useRoute';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { StageTabs } from '../../ui/StageTabs';
import { YearSelect } from '../../ui/YearSelect';
import { BreakdownDialog } from './BreakdownDialog';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ResultsPanel } from './ResultsPanel';
import styles from './ResultsScreen.module.css';

interface Props {
  year: number;
  /** The player whose breakdown is open over the table. */
  open?: string;
}

/** The official result of a final, from the archive, and the leaderboard it makes. */
export function ResultsScreen({ year, open }: Props) {
  const { t } = useI18n();
  const game = useGame(year);
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
        <StageTabs
          year={year}
          semis={game.semis.length}
          season={game.options.season}
          view="table"
        />
        <div className="empty frame">
          <p>{t.results.noFinalists}</p>
          <a className="btn btn-primary" href={routeHash({ name: 'final', year, view: 'players' })}>
            {t.results.toPlayers}
          </a>
        </div>
      </div>
    );

  const table = game.result
    ? standings(scoringEntries(game), game.result, game.finalists, game.options.joker)
    : [];
  const board = !!game.result;

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.results(year)}
        start={t.results.titleStart}
        end={t.results.titleEnd}
        lead={t.results.lead}
        aside={<YearSelect year={year} view="table" />}
      />
      <StageTabs year={year} semis={game.semis.length} season={game.options.season} view="table" />
      <div className={board ? styles.split : styles.single}>
        <ResultsPanel game={game} />
        {board && <LeaderboardPanel game={game} table={table} />}
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
