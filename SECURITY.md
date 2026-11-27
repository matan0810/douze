# Security

What there is to protect, what the site stores and talks to, and how each threat is answered.
Update it whenever any of these change (CLAUDE.md, section 4).

## What the site stores on a device

| Key                             | What                                                   |
| ------------------------------- | ------------------------------------------------------ |
| `eurorank:language`             | The language chosen in the header                      |
| `eurorank:game:<year>`          | A final changed or created on this device              |
| `eurorank:plan:<year>:<player>` | A plan in progress in planning mode, until it is saved |

Every value read back is parsed and checked (`src/hooks/storage.ts`,
`src/domain/game.ts`, `parseStoredGame`; `src/domain/plan.ts`, `parsePlan`), never cast: unknown countries and repeats are
dropped, a bad entry is ignored. The first site's keys (`eurorank_state_he_<year>`) are
read once, moved and removed.

## Hosts

The site talks to no host but its own: the flags (`public/flags/`, drawn by
`scripts/flags.ts` from the MIT-licensed `flag-icons`) and the Rubik and Syne fonts are part of the
site. The first site loaded both from outside hosts (Google Fonts, flagcdn.com); it no
longer does. The Content Security Policy (`vite.config.ts`)
enforces it, and the browser test fails if any request leaves the site. A new host needs a
reason, a change to the policy and a line here.

## The server (groundwork, issue #1)

The Worker `douze-api` (`worker/`, on Cloudflare; the standard is the template's `SERVER.md`)
has one address so far, `GET /health`, and holds no data and no secret. It is not yet
called by the site, so the Content Security Policy is unchanged: when the site first calls it,
its host goes into `connect-src` with this line. Held to the standard from the start:

- Deny by default: an unknown path is a plain 404, an unknown method a 405.
- CORS answers the site's own origins only (`ALLOWED_ORIGINS` in `wrangler.jsonc`).
- A request body is capped (`shared/limits.ts`) by its declared and its real size.
- An unexpected error is a plain 500 that names nothing; the log has only the kind of error,
  and one line per request without address, header or body.
- Every answer is `no-store`, `nosniff` and sent with no referrer.
- Secrets will be 256-bit random tokens stored as SHA-256 hashes, compared in constant time
  (`shared/tokens.ts`); who may do what is one table, checked cell by cell
  (`shared/capabilities.ts`).

The deploy token (`CLOUDFLARE_API_TOKEN`) and the account id are repository secrets, used
only by `deploy-worker.yml`, which has read-only permissions and keeps no checkout token.

## Threats and what answers them

| Threat                             | Answer                                                                                 | Checked by                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Script injection (XSS)             | Text is rendered as React text; CSP allows only the site's own files; Trusted Types on | e2e: CSP present, no violations                           |
| Tampered saved choices             | Parsed and checked; a bad value means the default                                      | unit (`storage.test.ts`, `game.test.ts`, `games.test.ts`) |
| A disguised download name          | ASCII names only, no path or direction characters                                      | unit (`download.test.ts`), e2e                            |
| A compromised dependency           | Few runtime dependencies; `npm audit` blocks high advisories; no install scripts       | CI                                                        |
| A compromised workflow step        | Read-only permissions by default; checkouts keep no token                              | review                                                    |
| A forged release                   | Releases only from the deploy workflow; version, commit and date checked               | unit (`changelog.test.ts`)                                |
| A request the server should refuse | Deny by default; origin, size and method checked; errors name nothing                  | unit (`worker/src/app.test.ts`), the real runtime         |
| A guessed or leaked secret         | 256-bit tokens, hashes only stored, constant-time comparison                           | unit (`shared/server.test.ts`)                            |
| A role doing too much              | One table of capabilities, deny by default, walked cell by cell                        | unit (`shared/server.test.ts`)                            |

## Known limits, accepted

- Devices do not sync: a final entered on one phone stays there until a server exists
  (issue #1).
- GitHub Pages sends no headers, so the policy is a `<meta>` tag and cannot forbid framing.
- Every Pages project of an account shares one origin (`<account>.github.io`), and with it
  `localStorage`. A custom domain gives the site an origin of its own.

## Repository settings

Set by the owner in the repository's settings on GitHub (README.md, "Starting a project"):
Dependabot alerts and security updates, secret scanning with push protection, CodeQL
default setup, a ruleset blocking force pushes and deletion on `master` and `dev`, and
read-only workflow permissions.

## Reporting

Open an issue on the repository, or tell the owner directly.
