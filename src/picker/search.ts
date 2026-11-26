import type { Country } from '../domain/types';

/** Folds what is typed and the names alike: case, geresh and apostrophes, extra spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[׳'`’"״]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The countries matching what was typed, in Hebrew or English: names that start with it
 * first, then names that contain it, each group in the order given.
 */
export function suggest(countries: readonly Country[], query: string): Country[] {
  const q = normalize(query);
  if (!q) return [...countries];
  const names = (c: Country) => [normalize(c.name.he), normalize(c.name.en)];
  const starts = countries.filter((c) => names(c).some((n) => n.startsWith(q)));
  const contains = countries.filter(
    (c) => !starts.includes(c) && names(c).some((n) => n.includes(q)),
  );
  return [...starts, ...contains];
}
