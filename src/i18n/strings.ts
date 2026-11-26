export const LANGUAGES = ['he', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Every piece of interface text, in Hebrew. English must provide the same keys. */
const he = {
  dir: 'rtl',
  brand: 'יורורנק',
  switchLanguage: 'English',
  switchLanguageLabel: 'Switch to English',
  version: (v: string) => `גרסה ${v}`,
  heroTitle: 'יורורנק',
  heroLine: 'חוזים את גמר האירוויזיון עם החברים, ומגלים מי ידע הכי טוב.',
  points: (n: number) => `${n} נק׳`,
};

export type Strings = typeof he;

const en: Strings = {
  dir: 'ltr',
  brand: 'EuroRank',
  switchLanguage: 'עברית',
  switchLanguageLabel: 'החלפה לעברית',
  version: (v) => `Version ${v}`,
  heroTitle: 'EuroRank',
  heroLine: 'Predict the Eurovision final with friends, and find out who knew best.',
  points: (n) => `${n} pts`,
};

export const STRINGS: Record<Language, Strings> = { he, en };

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** Hebrew for Hebrew browsers or clocks set to Israel, English for everyone else. */
export function defaultLanguage(browserLanguages: readonly string[], timeZone = ''): Language {
  if (
    browserLanguages.some(
      (l) => l.toLowerCase().startsWith('he') || l.toLowerCase().startsWith('iw'),
    )
  )
    return 'he';
  return timeZone === 'Asia/Jerusalem' || timeZone === 'Asia/Tel_Aviv' ? 'he' : 'en';
}
