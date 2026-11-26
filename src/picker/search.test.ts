import { describe, expect, it } from 'vitest';
import { archive } from '../domain/archive';
import { normalize, suggest } from './search';

const ids = (query: string) => suggest(archive.countries, query).map((c) => c.id);

describe('finding a country by what is typed', () => {
  it('ignores case, geresh and extra spaces', () => {
    expect(normalize(' צ׳כיה ')).toBe('צכיה');
    expect(normalize('San   MARINO')).toBe('san marino');
  });

  it('finds Hebrew and English names, those that start with it first', () => {
    expect(ids('צכ')).toEqual(['czechia']);
    expect(ids('איט')).toEqual(['italy']);
    expect(ids('isr')).toEqual(['israel']);
    expect(ids('land').slice(0, 3)).toEqual(['finland', 'iceland', 'ireland']);
  });

  it('lists everyone for an empty query and nobody for nonsense', () => {
    expect(ids('')).toHaveLength(archive.countries.length);
    expect(ids('zzz')).toEqual([]);
  });
});
