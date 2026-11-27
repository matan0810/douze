import { archive } from '../../domain/archive';
import { playerPieces } from '../../domain/pieces';
import { profiles } from '../../domain/profile';
import { countryGrid, headToHead, insights, scoredPlayers } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { YearSelect } from '../../ui/YearSelect';
import { CountryGrid } from './CountryGrid';
import { Duels } from './Duels';
import { GroupCards } from './GroupCards';
import { InsightCards } from './InsightCards';
import { PlayerProfiles } from './PlayerProfiles';
import styles from './StatsScreen.module.css';

/** What a final taught us, where each of us put every country, and who was closer. */
export function StatsScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const game = useGame(year);
  if (!game) return null;
  const found = insights(game);
  const players = scoredPlayers(game);
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));
  const pieces = playerPieces(game, archive.players);

  return (
    <div className={styles.page}>
      <PageTitle
        eyebrow={t.eyebrow.stats(year)}
        start={t.stats.titleStart}
        end={t.stats.titleEnd}
        lead={t.stats.lead}
        aside={<YearSelect year={year} view="stats" />}
      />
      {!found ? (
        <p className="empty frame">{t.stats.waiting}</p>
      ) : (
        <div className={styles.sections}>
          <InsightCards found={found} names={names} />
          <PlayerProfiles
            profiles={profiles(game)}
            size={game.finalists.length}
            names={names}
            pieces={pieces}
          />
          <GroupCards game={game} names={names} pieces={pieces} />
          <CountryGrid rows={countryGrid(game)} players={players} pieces={pieces} />
          {players.length > 1 && <Duels duels={headToHead(game)} names={names} pieces={pieces} />}
        </div>
      )}
    </div>
  );
}
