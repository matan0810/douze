import { useEffect } from 'react';
import { routeHash, semiIndex, type FinalView, type Route } from './domain/routes';
import { useRoute } from './hooks/useRoute';
import { useI18n } from './i18n/context';
import { NavBar } from './layout/NavBar';
import { StarBackground } from './layout/StarBackground';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { NewFinalScreen } from './screens/new/NewFinalScreen';
import { PlayersScreen } from './screens/players/PlayersScreen';
import { SeasonScreen } from './screens/season/SeasonScreen';
import { SemiScreen } from './screens/semi/SemiScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';
import { ResultsScreen } from './screens/results/ResultsScreen';
import { StatsScreen } from './screens/stats/StatsScreen';
import { useGames } from './state/context';
import styles from './App.module.css';

function yearOf(route: Route): number | undefined {
  return 'year' in route ? route.year : undefined;
}

export function App() {
  const route = useRoute();
  const { t } = useI18n();
  const { games, years } = useGames();
  const latest = years[0] ?? new Date().getFullYear();
  const year = yearOf(route) ?? latest;
  // A year this device does not know (an old link, a typo) shows the newest final.
  const known = games.has(year);

  useEffect(() => {
    if (!known && yearOf(route) !== undefined)
      window.history.replaceState(null, '', routeHash({ name: 'home' }));
  }, [known, route]);

  useEffect(() => {
    const names: Partial<Record<Route['name'], string>> = {
      history: t.nav.history,
      new: t.newFinal.titleStart + t.newFinal.titleEnd,
    };
    const views: Record<FinalView, string> = {
      table: t.nav.results,
      results: t.nav.results,
      players: t.nav.players,
      stats: t.nav.stats,
      'semi-1': t.stage.semi(1),
      'semi-2': t.stage.semi(2),
      season: t.stage.season,
      settings: t.settings.open,
    };
    const page =
      route.name === 'final' ? `${views[route.view]} · ${t.final(route.year)}` : names[route.name];
    document.title = page ? `${page} · ${t.brand}` : `${t.brand} · ${t.slogan}`;
  }, [route, t, latest]);

  return (
    <div className={styles.app}>
      <StarBackground />
      <NavBar route={route} year={known ? year : latest} />
      <main className={styles.main}>{screen(route, known)}</main>
      <footer className={styles.footer}>
        <span>{t.brand}</span>
        <span className="num" title={t.version(__APP_VERSION__)}>
          v{__APP_VERSION__}
        </span>
      </footer>
    </div>
  );
}

function screen(route: Route, known: boolean) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'new':
      return <NewFinalScreen />;
    case 'final':
    case 'player':
      if (!known) return <HomeScreen />;
      if (route.name === 'player')
        return <ResultsScreen key={route.year} year={route.year} open={route.id} />;
      if (route.view === 'players') return <PlayersScreen key={route.year} year={route.year} />;
      if (route.view === 'stats') return <StatsScreen key={route.year} year={route.year} />;
      if (route.view === 'season') return <SeasonScreen key={route.year} year={route.year} />;
      if (route.view === 'settings') return <SettingsScreen key={route.year} year={route.year} />;
      {
        const index = semiIndex(route.view);
        if (index !== undefined)
          return <SemiScreen key={`${route.year}-${index}`} year={route.year} index={index} />;
      }
      return (
        <ResultsScreen key={route.year} year={route.year} editing={route.view === 'results'} />
      );
  }
}
