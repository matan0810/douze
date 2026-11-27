# Douze

_Who really knows Eurovision?_ Douze (דוּז) is the Eurovision prediction game of our group
of friends. Each of us predicts the
order of the grand final; once the result is in, the site scores every prediction and keeps
the table, year after year. Hebrew and English.

Live at https://matan0810.github.io/douze.

## Commands

- `npm run dev`: the site with instant reload.
- `npm run check`: types, lint, format, unit tests. Must pass before any push.
- `npm run build && npm run e2e`: the browser test. It also builds its own copy with the
  server's address (`.env.e2e`, into `dist-e2e/`) and runs the Worker on this machine.
- `npm run worker:dev`: the Worker in the real Workers runtime, with a local database.
- `npm run bump -- patch|minor|major`: prepare a release.

## Layout

| Path                     | What                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/domain/`            | Scoring, data checks, games, statistics, addresses: no UI                                                         |
| `shared/`                | What the site and the Worker both use: limits, roles, secrets, names (no DOM, no Worker APIs)                     |
| `worker/`                | The Cloudflare Worker: `npm run worker:dev`, deployed by `deploy-worker.yml` (issue #1)                           |
| `src/data/`              | Countries, players, and one file per year in `editions/`                                                          |
| `src/state/`             | What this device keeps: its finals, and the groups it belongs to                                                  |
| `src/net/`               | Calls to the server, each answer parsed                                                                           |
| `src/screens/`           | One folder per screen: home, players, results, semi, season, settings, plan, reveal, stats, groups, …             |
| `src/picker/`            | Building a ranking: search, keyboard, drag                                                                        |
| `src/ui/`, `src/layout/` | Shared pieces: flags, dialog, titles, the sky, the bar                                                            |
| `src/export/`            | The table as an image, downloads                                                                                  |
| `src/i18n/`              | Hebrew and English strings                                                                                        |
| `src/styles/`            | Tokens and the shared forms of the look; the bundled font                                                         |
| `public/flags/`          | A flag for every country (`node scripts/flags.ts` draws them)                                                     |
| `public/brand/`          | The mirror ball, icons and the card (`node scripts/brand.ts`)                                                     |
| `scripts/`               | Version bump, CHANGELOG helpers, release plan, flags                                                              |
| `tests/e2e/`             | Browser test (`smoke.mjs`): every screen and flow, desktop and phone, both languages; `api.mjs` the Worker for it |
| `.github/workflows/`     | `checks.yml`, `ci.yml` (branches), `deploy.yml` (Pages)                                                           |

## The server

The groups need the Worker (`worker/`, issue #1). `deploy-worker.yml` deploys it from
`master` once the repository has the secrets `CLOUDFLARE_API_TOKEN` (an API token with
Workers Scripts: Edit and D1: Edit on the account) and `CLOUDFLARE_ACCOUNT_ID`; it creates
the database the first time and applies the migrations. The site learns the Worker's
address from the repository variable `API_URL` (Settings → Secrets and variables → Actions
→ Variables), read by `deploy.yml`'s build. Without it the site is built with no groups.

How work is done: `CLAUDE.md`. Rules and numbers: `DESIGN.md`. Changes: `CHANGELOG.md`.
Security: `SECURITY.md`.

The flags are from [flag-icons](https://github.com/lipis/flag-icons) (MIT).
