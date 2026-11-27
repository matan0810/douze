import type { Member } from '../../../shared/groups';
import type { StageView } from '../../../shared/years';
import { archive } from '../../domain/archive';
import { badges } from '../../domain/badges';
import type { Game } from '../../domain/game';
import { playerPieces } from '../../domain/pieces';
import { standings } from '../../domain/scoring';
import { scoringEntries } from '../../domain/stats';
import { semiStandings } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { Leaderboard } from '../results/Leaderboard';
import { SemiBoard } from '../semi/SemiBoard';
import { EntryList } from './EntryList';
import styles from './GroupYear.module.css';

interface Props {
  stage: StageView;
  game: Game;
  members: readonly Member[];
}

/**
 * A locked stage: everyone's predictions, and the table once this phone knows the result,
 * scored by the site's own rules (`scoring.ts`, `semis.ts`).
 */
export function Revealed({ stage, game, members }: Props) {
  const { t } = useI18n();
  const names = new Map(members.map((m) => [m.id, m.name]));
  const pieces = playerPieces(game, archive.players);
  const index = stage.stage === 'semi-1' ? 0 : 1;
  const semi = stage.stage === 'final' ? undefined : game.semis[index];
  if (!stage.entries.length) return <p className="empty frame">{t.groupYear.nobody}</p>;

  const board =
    stage.stage === 'final' && game.result ? (
      <Leaderboard
        year={game.year}
        table={standings(scoringEntries(game), game.result, game.finalists, game.options.joker)}
        names={names}
        pieces={pieces}
        badges={badges(game)}
        live={false}
        linked={false}
      />
    ) : semi?.qualifiers ? (
      <SemiBoard semi={semi} table={semiStandings(semi)} names={names} pieces={pieces} />
    ) : (
      <p className="note">{t.groupYear.noResult}</p>
    );

  return (
    <div className={styles.stack}>
      {board}
      <section className={styles.section} aria-labelledby="everyone">
        <h2 id="everyone" className="section-label">
          {t.groupYear.everyone}
        </h2>
        <EntryList stage={stage} names={names} />
      </section>
    </div>
  );
}
