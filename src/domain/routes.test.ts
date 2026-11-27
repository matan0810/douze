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
    ['#/2026/plan', { name: 'final', year: 2026, view: 'plan' }],
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

describe('years before 2026', () => {
  it('have addresses of their own: the archive holds 2024 and 2025', () => {
    expect(parseRoute('#/2024')).toEqual({ name: 'final', year: 2024, view: 'table' });
    expect(parseRoute('#/2025/semi-1')).toEqual({ name: 'final', year: 2025, view: 'semi-1' });
    expect(routeHash({ name: 'final', year: 2024, view: 'players' })).toBe('#/2024/players');
  });

  it('start with the first contest, 1956, as the data checks do', () => {
    expect(parseRoute('#/1956').name).toBe('final');
    expect(parseRoute('#/1955').name).toBe('home');
  });
});
