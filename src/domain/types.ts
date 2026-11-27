import type { Piece } from './pieces';
import type { Semi } from './semis';

/** A text in both interface languages. */
export interface Bilingual {
  he: string;
  en: string;
}

/** A country that can take part, from the catalogue in `src/data/countries.json`. */
export interface Country {
  id: string;
  /** ISO 3166-1 alpha-2, lower case: names the flag in `public/flags/`. */
  code: string;
  name: Bilingual;
}

/** One of us, from `src/data/players.json`: the same person across the years. */
export interface Player {
  id: string;
  name: Bilingual;
  /** Their colour on every screen (`pieces.ts`). */
  piece?: Piece;
}

/** One player's predicted order of the final: country ids, first place first. */
export interface Prediction {
  player: string;
  order: string[];
  /** The country whose points count double, in a year with the joker on (`scoring.ts`). */
  joker?: string;
}

/** One year's grand final. */
export interface Edition {
  year: number;
  host: Bilingual;
  /** The date of the grand final, YYYY-MM-DD. */
  final: string;
  /** The countries in the grand final, in the catalogue's order. */
  finalists: string[];
  /** The official order of the final, first place first; null until it is known. */
  result: string[] | null;
  predictions: Prediction[];
  /** The year's semi-finals, apart from the final (`semis.ts`); none for a year without. */
  semis: Semi[];
  /** The order the final's songs were performed in; empty when not entered. */
  runningOrder: string[];
  /** Whether the semis and the final add up to a season table this year. */
  season: boolean;
  /** Whether each player has a joker in the final this year. */
  joker: boolean;
}

/** Everything the site knows: the catalogue, the players and every edition, newest first. */
export interface Archive {
  countries: Country[];
  players: Player[];
  editions: Edition[];
}
