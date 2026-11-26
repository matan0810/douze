import { isYear } from './game';

export type FinalView = 'table' | 'players' | 'results' | 'stats';
export const FINAL_VIEWS: readonly FinalView[] = ['table', 'players', 'results', 'stats'];

export type Route =
  | { name: 'home' }
  | { name: 'final'; year: number; view: FinalView }
  | { name: 'player'; year: number; id: string }
  | { name: 'history' }
  | { name: 'new' };

const isView = (v: unknown): v is FinalView => FINAL_VIEWS.some((view) => view === v);

/**
 * Every screen has its own address in the hash, so it can be shared and survives a reload
 * (DESIGN.md, section 5). Unknown addresses fall back to home.
 */
export function parseRoute(hash: string): Route {
  const [first, second, third] = hash.replace(/^#\/?/, '').split(/[/?]/);
  if (first === 'history') return { name: 'history' };
  if (first === 'new') return { name: 'new' };
  const year = /^\d{4}$/.test(first ?? '') ? Number(first) : NaN;
  if (!isYear(year)) return { name: 'home' };
  if (second === 'player' && third && /^[\w-]{1,60}$/.test(third))
    return { name: 'player', year, id: third };
  return { name: 'final', year, view: isView(second) ? second : 'table' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'history':
      return '#/history';
    case 'new':
      return '#/new';
    case 'final':
      return route.view === 'table' ? `#/${route.year}` : `#/${route.year}/${route.view}`;
    case 'player':
      return `#/${route.year}/player/${route.id}`;
  }
}
