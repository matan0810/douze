import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import { parseArchive, parseEdition } from './parse';

const countries = [
  { id: 'a', code: 'aa', name: { he: 'א', en: 'A' } },
  { id: 'b', code: 'bb', name: { he: 'ב', en: 'B' } },
];
const players = [{ id: 'p', name: { he: 'פ', en: 'P' } }];
const edition = {
  year: 2030,
  host: { he: 'עיר', en: 'City' },
  final: '2030-05-18',
  finalists: ['a', 'b'],
  result: ['b', 'a'],
  predictions: [{ player: 'p', order: ['a', 'b'] }],
};

describe('the data files', () => {
  it('pass every check', () => {
    expect(archive.editions.length).toBeGreaterThan(0);
  });

  it('list editions newest first', () => {
    const years = archive.editions.map((e) => e.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('have a flag for every country in the catalogue', () => {
    for (const country of archive.countries)
      expect(
        existsSync(new URL(`../../public/flags/${country.code}.png`, import.meta.url)),
        country.id,
      ).toBe(true);
  });
});

describe('an edition', () => {
  it('is read when well formed', () => {
    expect(parseEdition(edition, countries, players).result).toEqual(['b', 'a']);
  });

  it('may wait for its result', () => {
    expect(parseEdition({ ...edition, result: null }, countries, players).result).toBeNull();
  });

  it.each([
    ['a finalist outside the catalogue', { finalists: ['a', 'z'] }],
    ['a finalist twice', { finalists: ['a', 'a'] }],
    ['a result missing a finalist', { result: ['a'] }],
    ['a result with a stranger', { result: ['a', 'z'] }],
    ['a prediction by an unknown player', { predictions: [{ player: 'x', order: ['a', 'b'] }] }],
    ['an incomplete prediction', { predictions: [{ player: 'p', order: ['a'] }] }],
    ['a bad date', { final: '18/05/2030' }],
    ['a year out of range', { year: 1900 }],
  ])('refuses %s', (_, change) => {
    expect(() => parseEdition({ ...edition, ...change }, countries, players)).toThrow();
  });

  it('refuses two files for one year', () => {
    expect(() => parseArchive({ countries, players, editions: [edition, edition] })).toThrow(
      /twice/,
    );
  });
});
