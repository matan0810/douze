import catalogue from '../src/data/countries.json';

/**
 * The closed list a country must be on to reach the server: the site's catalogue
 * (`src/data/countries.json`), checked against the rules in `src/domain/parse.ts`.
 */
export const COUNTRY_IDS: ReadonlySet<string> = new Set(catalogue.map((country) => country.id));

export function isCountry(value: unknown): value is string {
  return typeof value === 'string' && COUNTRY_IDS.has(value);
}
