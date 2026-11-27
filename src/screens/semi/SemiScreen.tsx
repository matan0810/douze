import { useState } from 'react';
import { archive } from '../../domain/archive';
import { setSemiPick, setSemiQualifiers } from '../../domain/game';
import { playerPieces } from '../../domain/pieces';
import { routeHash, semiView } from '../../domain/routes';
import { semiStandings } from '../../domain/semis';
import { useI18n } from '../../i18n/context';
import { useGame, useGames } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { StageTabs } from '../../ui/StageTabs';
import { YearSelect } from '../../ui/YearSelect';
import { QualifiersPanel } from './QualifiersPanel';
import { SemiBoard } from './SemiBoard';
import { SemiPickEditor } from './SemiPickEditor';
import { SemiPicks } from './SemiPicks';
import styles from './SemiScreen.module.css';

/** One semi-final: who qualified, the picks of each player and the semi's own table. */
export function SemiScreen({ year, index }: { year: number; index: number }) {
  const { t, language } = useI18n();
  const { update } = useGames();
  const game = useGame(year);
  const [picking, setPicking] = useState<string | null>(null);
  if (!game) return null;
  const semi = game.semis[index];
  const view = semiView(index);
  const n = index + 1;
  const title = (
    <PageTitle
      eyebrow={t.eyebrow.semi(n, year)}
      start={t.semi.titleStart}
      end={t.semi.titleEnd(n)}
      lead={t.semi.lead}
      aside={<YearSelect year={year} view={view} />}
    />
  );

  if (!semi || !semi.countries.length)
    return (
      <div className={styles.page}>
        {title}
        <StageTabs year={year} semis={game.semis.length} season={game.options.season} view={view} />
        <div className="empty frame">
          <p>{t.semi.noCountries}</p>
          <a
            className="btn btn-primary"
            href={routeHash({ name: 'final', year, view: 'settings' })}
          >
            {t.semi.toSettings}
          </a>
        </div>
      </div>
    );

  const pieces = playerPieces(game, archive.players);
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));
  const table = semiStandings(semi);
  const player = game.players.find((p) => p.id === picking);
  const own = semi.predictions.find((p) => p.player === picking);

  return (
    <div className={styles.page}>
      {title}
      <StageTabs year={year} semis={game.semis.length} season={game.options.season} view={view} />
      <div className={table.length ? styles.split : styles.single}>
        <div className={styles.side}>
          <QualifiersPanel
            key={semi.qualifiers?.join() ?? ''}
            semi={semi}
            onSave={(qualifiers) => update(year, (g) => setSemiQualifiers(g, index, qualifiers))}
          />
          <SemiPicks game={game} semi={semi} pieces={pieces} onPick={(id) => setPicking(id)} />
        </div>
        {table.length > 0 && <SemiBoard semi={semi} table={table} names={names} pieces={pieces} />}
      </div>
      {player && (
        <SemiPickEditor
          key={player.id}
          title={t.semi.pickTitle(player.name[language], n)}
          semi={semi}
          initial={own}
          onSave={(picks, reserve) => {
            update(year, (g) => setSemiPick(g, index, player.id, picks, reserve));
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
