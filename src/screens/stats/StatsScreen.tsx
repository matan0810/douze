import { countryGrid, headToHead, insights, scoredPlayers } from '../../domain/stats';
import { useI18n } from '../../i18n/context';
import { useGame } from '../../state/context';
import { PageTitle } from '../../ui/PageTitle';
import { YearSelect } from '../../ui/YearSelect';
import { CountryGrid } from './CountryGrid';
import { Duels } from './Duels';
import { InsightCards } from './InsightCards';
import styles from './StatsScreen.module.css';

/** What a final taught us, where each of us put every country, and who was closer. */
export function StatsScreen({ year }: { year: number }) {
  const { t, language } = useI18n();
  const game = useGame(year);
  if (!game) return null;
  const found = insights(game);
  const players = scoredPlayers(game);
  const names = new Map(game.players.map((p) => [p.id, p.name[language]]));

  return (
    <div className={styles.page}>
      <PageTitle
        start={t.stats.titleStart}
        end={t.stats.titleEnd}
        tone="purple"
        lead={t.stats.lead}
        aside={<YearSelect year={year} view="stats" />}
      />
      {!found ? (
        <p className="empty glass panel">{t.stats.waiting}</p>
      ) : (
        <div className={styles.sections}>
          <InsightCards found={found} names={names} />
          <CountryGrid rows={countryGrid(game)} players={players} />
          {players.length > 1 && <Duels duels={headToHead(game)} names={names} />}
        </div>
      )}
    </div>
  );
}
