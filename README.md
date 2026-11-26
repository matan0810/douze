# EuroRank

יורורנק: the Eurovision prediction game of our group of friends. Each of us predicts the
order of the grand final; once the result is in, the site scores every prediction and keeps
the table, year after year. Hebrew and English.

Live at https://matan0810.github.io/euro-rank.

## Commands

- `npm run dev`: the site with instant reload.
- `npm run check`: types, lint, format, unit tests. Must pass before any push.
- `npm run build && npm run e2e`: the browser test.
- `npm run bump -- patch|minor|major`: prepare a release.

## Layout

| Path                  | What                                                     |
| --------------------- | -------------------------------------------------------- |
| `src/domain/`         | Scoring, data checks and statistics, with no UI          |
| `src/data/`           | Countries, players, and one file per year in `editions/` |
| `src/i18n/`           | Hebrew and English strings                               |
| `public/flags/`       | Flags of every country in the catalogue                  |
| `scripts/`            | Version bump, CHANGELOG helpers and the release plan     |
| `tests/e2e/smoke.mjs` | Browser test: desktop and phone, both languages, the CSP |
| `.github/workflows/`  | `checks.yml`, `ci.yml` (branches), `deploy.yml` (Pages)  |

How work is done: `CLAUDE.md`. Rules and numbers: `DESIGN.md`. Changes: `CHANGELOG.md`.
Security: `SECURITY.md`.

The flags are from [flag-icons](https://github.com/lipis/flag-icons) (MIT).
