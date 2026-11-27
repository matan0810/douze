import { isId, isSecret } from '../../shared/ids';
import { isYear } from './game';

export const FINAL_VIEWS = [
  'table',
  'players',
  'results',
  'stats',
  'semi-1',
  'semi-2',
  'season',
  'settings',
  'reveal',
  'plan',
] as const;
export type FinalView = (typeof FINAL_VIEWS)[number];

/** The view of a year's semi, by its index. */
export function semiView(index: number): FinalView {
  return index === 0 ? 'semi-1' : 'semi-2';
}

/** The index of the semi a view shows, or undefined. */
export function semiIndex(view: FinalView): number | undefined {
  return view === 'semi-1' ? 0 : view === 'semi-2' ? 1 : undefined;
}

export type Route =
  | { name: 'home' }
  | { name: 'final'; year: number; view: FinalView }
  | { name: 'player'; year: number; id: string }
  | { name: 'history' }
  | { name: 'new' }
  | { name: 'groups' }
  | { name: 'group'; id: string }
  /** An invitation: the secret rides in the hash, which never reaches a server's log. */
  | { name: 'join'; id: string; secret: string };

const isView = (v: unknown): v is FinalView => FINAL_VIEWS.some((view) => view === v);

/**
 * Every screen has its own address in the hash, so it can be shared and survives a reload
 * (DESIGN.md, section 5). Unknown addresses fall back to home.
 */
export function parseRoute(hash: string): Route {
  const [first, second, third] = hash.replace(/^#\/?/, '').split(/[/?]/);
  if (first === 'history') return { name: 'history' };
  if (first === 'new') return { name: 'new' };
  if (first === 'groups') return { name: 'groups' };
  if (first === 'group' && isId(second)) return { name: 'group', id: second };
  if (first === 'join' && isId(second) && isSecret(third))
    return { name: 'join', id: second, secret: third };
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
    case 'groups':
      return '#/groups';
    case 'group':
      return `#/group/${route.id}`;
    case 'join':
      return `#/join/${route.id}/${route.secret}`;
  }
}
