import { isYear } from './game';

export type FinalView = 'table' | 'players' | 'results' | 'stats';
export const FINAL_VIEWS: readonly FinalView[] = ['table', 'players', 'results', 'stats'];

export type Route =
  | { name: 'home' }
  | { name: 'final'; year: number; view: FinalView }
  | { name: 'player'; year: number; id: string }
  /** `field`: the finalists, encoded as in `links.ts`, for a device that lacks the final. */
  | { name: 'mine'; year: number; field?: string }
  | { name: 'history' }
  | { name: 'new' }
  | { name: 'received'; kind: 'prediction' | 'group'; query: string };

const isView = (v: unknown): v is FinalView => FINAL_VIEWS.some((view) => view === v);

/**
 * Every screen has its own address in the hash, so it can be shared and survives a reload
 * (DESIGN.md, section 5). Unknown addresses fall back to home.
 */
export function parseRoute(hash: string): Route {
  const body = hash.replace(/^#\/?/, '');
  const question = body.indexOf('?');
  const path = question < 0 ? body : body.slice(0, question);
  const query = question < 0 ? '' : body.slice(question + 1);
  const [first, second, third] = path.split('/');
  if (first === 'predict' && query) return { name: 'received', kind: 'prediction', query };
  if (first === 'join' && query) return { name: 'received', kind: 'group', query };
  if (first === 'history') return { name: 'history' };
  if (first === 'new') return { name: 'new' };
  const year = /^\d{4}$/.test(first ?? '') ? Number(first) : NaN;
  if (!isYear(year)) return { name: 'home' };
  if (second === 'player' && third && /^[\w-]{1,60}$/.test(third))
    return { name: 'player', year, id: third };
  if (second === 'predict') {
    const field = new URLSearchParams(query).get('f');
    return field && /^[0-9a-zA-Z]{2,40}$/.test(field)
      ? { name: 'mine', year, field }
      : { name: 'mine', year };
  }
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
    case 'mine':
      return route.field ? `#/${route.year}/predict?f=${route.field}` : `#/${route.year}/predict`;
    case 'received':
      return `#/${route.kind === 'prediction' ? 'predict' : 'join'}?${route.query}`;
  }
}

/**
 * The first site lived at real paths (`/euro-rank/players`, `/euro-rank/results`). Pages
 * serves its 404 page, which is this site, for those; this is where each one went.
 */
export function legacyHash(pathname: string, base: string, latestYear: number): string | undefined {
  if (!pathname.startsWith(base)) return undefined;
  const rest = pathname.slice(base.length).replace(/\/+$/, '');
  if (rest === '' || rest === 'index.html') return undefined;
  if (rest === 'players') return `#/${latestYear}/players`;
  if (rest === 'results') return `#/${latestYear}/results`;
  return '#/';
}
