import countries from '../data/countries.json';
import players from '../data/players.json';
import { parseArchive } from './parse';
import type { Archive, Country } from './types';

/** Every edition file in `src/data/editions/`, picked up by name: a new year is a new file. */
const files = import.meta.glob<unknown>('../data/editions/*.json', {
  eager: true,
  import: 'default',
});

/** The site's data, checked once at start (`parse.ts`). */
export const archive: Archive = parseArchive({
  countries,
  players,
  editions: Object.values(files),
});

/** Catalogue lookups, used across the screens. */
export const countryById: ReadonlyMap<string, Country> = new Map(
  archive.countries.map((c) => [c.id, c]),
);

export function countryName(id: string, language: 'he' | 'en'): string {
  return countryById.get(id)?.name[language] ?? id;
}
