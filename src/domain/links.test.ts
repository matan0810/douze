import { describe, expect, it } from 'vitest';
import { archive } from './archive';
import {
  decodeOrder,
  encodeOrder,
  groupHash,
  MAX_QUERY,
  predictionHash,
  readGroupLink,
  readPredictionLink,
} from './links';
import { game2026 } from './testGame';

const { countries } = archive;
const query = (hash: string) => hash.slice(hash.indexOf('?') + 1);

describe('the catalogue in links', () => {
  it('only grows at its end: links already sent keep their meaning', () => {
    // The first countries, in their places. Append new ones; never reorder or remove.
    expect(countries.slice(0, 41).map((c) => c.id)).toEqual(
      'albania armenia australia austria azerbaijan belgium bulgaria croatia cyprus czechia denmark estonia finland france georgia germany greece iceland ireland israel italy latvia lithuania luxembourg malta moldova montenegro netherlands north-macedonia norway poland portugal romania san-marino serbia slovenia spain sweden switzerland ukraine united-kingdom'.split(
        ' ',
      ),
    );
    expect(countries.length).toBeLessThanOrEqual(62);
  });

  it('turns an order into one character per country and back', () => {
    const order = ['israel', 'albania', 'united-kingdom'];
    expect(encodeOrder(order, countries)).toBe('j0E');
    expect(decodeOrder('j0E', countries)).toEqual(order);
  });

  it('refuses unknown characters and repeats', () => {
    expect(decodeOrder('j0Z', countries)).toBeUndefined();
    expect(decodeOrder('jj', countries)).toBeUndefined();
    expect(decodeOrder('j-', countries)).toBeUndefined();
  });
});

describe('a prediction link', () => {
  const order = game2026().players[0]?.order ?? [];

  it('carries a name and an order', () => {
    const hash = predictionHash(2026, 'דנה כהן', order, countries);
    // 25 countries and a Hebrew name, percent-encoded: short enough for any chat.
    expect(hash.length).toBeLessThan(120);
    expect(readPredictionLink(query(hash), countries)).toEqual({
      year: 2026,
      prediction: { name: 'דנה כהן', order },
    });
  });

  it('keeps a dash inside the name', () => {
    const hash = predictionHash(2026, 'בן-דוד', order, countries);
    expect(readPredictionLink(query(hash), countries)?.prediction.name).toBe('בן-דוד');
  });

  it.each([
    ['no year', 'p=j0-x'],
    ['a year out of range', 'y=1999&p=j0-x'],
    ['no name', 'y=2026&p=j0-'],
    ['no order', 'y=2026&p=-x'],
    ['a repeated country', 'y=2026&p=jj-x'],
    ['an overlong query', `y=2026&p=j0-${'x'.repeat(MAX_QUERY)}`],
  ])('refuses %s', (_, raw) => {
    expect(readPredictionLink(raw, countries)).toBeUndefined();
  });
});

describe('a group link', () => {
  it('carries the field, the result and every prediction', () => {
    const game = game2026();
    const shared = readGroupLink(query(groupHash(game, 'he', countries)), countries);
    expect(shared).toEqual({
      year: 2026,
      finalists: game.finalists,
      result: game.result,
      players: game.players.map((p) => ({ name: p.name.he, order: p.order })),
    });
  });

  it('may come before the result, with a prediction still in progress', () => {
    const game = { ...game2026(), result: null };
    game.players[0] = { id: 'p1', name: { he: 'x', en: 'x' }, order: ['israel'] };
    const shared = readGroupLink(query(groupHash(game, 'en', countries)), countries);
    expect(shared?.result).toBeNull();
    expect(shared?.players[0]?.order).toEqual(['israel']);
  });

  it.each([
    ['a result missing a finalist', 'y=2026&f=j0E&r=j0'],
    ['a prediction outside the field', 'y=2026&f=j0E&p=j1-x'],
    ['two players of one name', 'y=2026&f=j0E&p=j-x&p=0-x'],
    ['a field of one', 'y=2026&f=j'],
  ])('refuses %s', (_, raw) => {
    expect(readGroupLink(raw, countries)).toBeUndefined();
  });
});
