import { useEffect } from 'react';
import { routeHash, semiIndex, type FinalView, type Route } from './domain/routes';
import { useRoute } from './hooks/useRoute';
import { useI18n } from './i18n/context';
import { NavBar } from './layout/NavBar';
import { StarBackground } from './layout/StarBackground';
import { apiOrigin } from './net/api';
import { GroupYearScreen } from './screens/groupYear/GroupYearScreen';
import { GroupScreen } from './screens/groups/GroupScreen';
import { GroupsScreen } from './screens/groups/GroupsScreen';
import { JoinScreen } from './screens/groups/JoinScreen';
import { HistoryScreen } from './screens/history/HistoryScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { NewFinalScreen } from './screens/new/NewFinalScreen';
import { PlayersScreen } from './screens/players/PlayersScreen';
import { PlanScreen } from './screens/plan/PlanScreen';
import { RevealScreen } from './screens/reveal/RevealScreen';
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
      groups: t.nav.groups,
      group: t.nav.groups,
      groupYear: t.nav.groups,
      join: t.join.titleStart + t.join.titleEnd,
    };
    const views: Record<FinalView, string> = {
      table: t.nav.results,
      players: t.nav.players,
      stats: t.nav.stats,
      'semi-1': t.stage.semi(1),
      'semi-2': t.stage.semi(2),
      season: t.stage.season,
      settings: t.settings.open,
      reveal: t.reveal.open,
      plan: t.plan.open,
    };
    const page =
      route.name === 'final'
        ? `${views[route.view]} · ${t.final(route.year)}`
        : route.name === 'groupYear'
          ? `${t.nav.groups} · ${route.year}`
          : names[route.name];
    // The tab carries the page, not the name: the mark beside it already says whose it is, and
    // a Latin name beside Hebrew words scrambles the order of the tab (owner, 2026-11-27).
    document.title = page ?? t.brand;
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
    // Groups need the server: a build without one shows home in their place.
    case 'groups':
      return apiOrigin() ? <GroupsScreen /> : <HomeScreen />;
    case 'group':
      return apiOrigin() ? <GroupScreen key={route.id} id={route.id} /> : <HomeScreen />;
    case 'groupYear':
      return apiOrigin() ? (
        <GroupYearScreen
          key={`${route.id}-${route.year}`}
          id={route.id}
          year={route.year}
          stage={route.stage}
        />
      ) : (
        <HomeScreen />
      );
    case 'join':
      return apiOrigin() ? (
        <JoinScreen key={route.id} id={route.id} secret={route.secret} />
      ) : (
        <HomeScreen />
      );
    case 'final':
    case 'player':
      if (!known) return <HomeScreen />;
      if (route.name === 'player')
        return <ResultsScreen key={route.year} year={route.year} open={route.id} />;
      if (route.view === 'players') return <PlayersScreen key={route.year} year={route.year} />;
      if (route.view === 'stats') return <StatsScreen key={route.year} year={route.year} />;
      if (route.view === 'plan') return <PlanScreen key={route.year} year={route.year} />;
      if (route.view === 'reveal') return <RevealScreen key={route.year} year={route.year} />;
      if (route.view === 'season') return <SeasonScreen key={route.year} year={route.year} />;
      if (route.view === 'settings') return <SettingsScreen key={route.year} year={route.year} />;
      {
        const index = semiIndex(route.view);
        if (index !== undefined)
          return <SemiScreen key={`${route.year}-${index}`} year={route.year} index={index} />;
      }
      return <ResultsScreen key={route.year} year={route.year} />;
  }
}
