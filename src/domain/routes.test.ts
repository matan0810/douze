import { describe, expect, it } from 'vitest';
import { legacyHash, parseRoute, routeHash, type Route } from './routes';

describe('addresses', () => {
  it.each<[string, Route]>([
    ['#/', { name: 'home' }],
    ['#/2026', { name: 'final', year: 2026, view: 'table' }],
    ['#/2026/players', { name: 'final', year: 2026, view: 'players' }],
    ['#/2026/results', { name: 'final', year: 2026, view: 'results' }],
    ['#/2026/stats', { name: 'final', year: 2026, view: 'stats' }],
    ['#/2026/player/matan', { name: 'player', year: 2026, id: 'matan' }],
    ['#/2027/predict', { name: 'mine', year: 2027 }],
    ['#/history', { name: 'history' }],
    ['#/new', { name: 'new' }],
    ['#/predict?y=2026&p=j-x', { name: 'received', kind: 'prediction', query: 'y=2026&p=j-x' }],
    ['#/join?y=2026&f=j0', { name: 'received', kind: 'group', query: 'y=2026&f=j0' }],
  ])('%s round-trips', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
    expect(routeHash(route)).toBe(hash);
  });

  it.each(['', '#', '#/nothing', '#/1999', '#/2026/player/<x>', '#/predict', '#/26'])(
    '%s falls back sensibly',
    (hash) => {
      const route = parseRoute(hash);
      expect(['home', 'final']).toContain(route.name);
    },
  );

  it('sends the first site’s paths to their screens', () => {
    expect(legacyHash('/euro-rank/players', '/euro-rank/', 2026)).toBe('#/2026/players');
    expect(legacyHash('/euro-rank/results/', '/euro-rank/', 2026)).toBe('#/2026/results');
    expect(legacyHash('/euro-rank/other', '/euro-rank/', 2026)).toBe('#/');
    expect(legacyHash('/euro-rank/', '/euro-rank/', 2026)).toBeUndefined();
  });
});
