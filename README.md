# Douze

_Who really knows Eurovision?_ Douze (דוּז) is the Eurovision prediction game of our group
of friends. Each of us predicts the
order of the grand final; once the result is in, the site scores every prediction and keeps
the table, year after year. Hebrew and English.

Live at https://matan0810.github.io/euro-rank.

## Commands

- `npm run dev`: the site with instant reload.
- `npm run check`: types, lint, format, unit tests. Must pass before any push.
- `npm run build && npm run e2e`: the browser test.
- `npm run bump -- patch|minor|major`: prepare a release.

## Layout

| Path                     | What                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| `src/domain/`            | Scoring, data checks, games, statistics, addresses: no UI              |
| `src/data/`              | Countries, players, and one file per year in `editions/`               |
| `src/state/`             | The finals of this device, saved and read back                         |
| `src/screens/`           | One folder per screen: home, players, results, stats, history, …       |
| `src/picker/`            | Building a ranking: search, keyboard, drag                             |
| `src/ui/`, `src/layout/` | Shared pieces: flags, dialog, titles, the sky, the bar                 |
| `src/export/`            | The table as an image, downloads                                       |
| `src/i18n/`              | Hebrew and English strings                                             |
| `src/styles/`            | Tokens and the shared forms of the look; the bundled font              |
| `public/flags/`          | A flag for every country (`node scripts/flags.ts` draws them)          |
| `public/brand/`          | The mirror ball, icons and the card (`node scripts/brand.ts`)          |
| `scripts/`               | Version bump, CHANGELOG helpers, release plan, flags                   |
| `tests/e2e/smoke.mjs`    | Browser test: every screen and flow, desktop and phone, both languages |
| `.github/workflows/`     | `checks.yml`, `ci.yml` (branches), `deploy.yml` (Pages)                |

How work is done: `CLAUDE.md`. Rules and numbers: `DESIGN.md`. Changes: `CHANGELOG.md`.
Security: `SECURITY.md`.

The flags are from [flag-icons](https://github.com/lipis/flag-icons) (MIT).
