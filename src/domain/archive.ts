import countries from '../data/countries.json';
import players from '../data/players.json';
import { parseArchive } from './parse';
import type { Archive } from './types';

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
