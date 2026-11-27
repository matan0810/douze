import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, type Route } from './routes';

describe('addresses', () => {
  it.each<[string, Route]>([
    ['#/', { name: 'home' }],
    ['#/2026', { name: 'final', year: 2026, view: 'table' }],
    ['#/2026/players', { name: 'final', year: 2026, view: 'players' }],
    ['#/2026/results', { name: 'final', year: 2026, view: 'results' }],
    ['#/2026/stats', { name: 'final', year: 2026, view: 'stats' }],
    ['#/2026/semi-1', { name: 'final', year: 2026, view: 'semi-1' }],
    ['#/2026/semi-2', { name: 'final', year: 2026, view: 'semi-2' }],
    ['#/2026/season', { name: 'final', year: 2026, view: 'season' }],
    ['#/2026/settings', { name: 'final', year: 2026, view: 'settings' }],
    ['#/2026/reveal', { name: 'final', year: 2026, view: 'reveal' }],
    ['#/2026/player/matan', { name: 'player', year: 2026, id: 'matan' }],
    ['#/history', { name: 'history' }],
    ['#/new', { name: 'new' }],
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
});
