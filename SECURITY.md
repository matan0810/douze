# Security

What there is to protect, what the site stores and talks to, and how each threat is answered.
Update it whenever any of these change (CLAUDE.md, section 4).

## What the site stores on a device

| Key                             | What                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `eurorank:language`             | The language chosen in the header                          |
| `eurorank:game:<year>`          | A final changed or created on this device, not its results |
| `eurorank:plan:<year>:<player>` | A plan in progress in planning mode, until it is saved     |
| `eurorank:groups`               | The groups this device belongs to (see below)              |

Every value read back is parsed and checked (`src/hooks/storage.ts`,
`src/domain/game.ts`, `parseStoredGame`; `src/domain/plan.ts`, `parsePlan`;
`src/state/memberships.ts`, `parseMemberships`), never cast: unknown countries and repeats are
dropped, a bad entry is ignored. The first site's keys (`eurorank_state_he_<year>`) are
read once, moved and removed.

## Hosts

The site talks to no host but its own, and the server's when the build has one
(`VITE_API_URL`, from the repository variable `API_URL`): only that origin is added to
`connect-src`, and only https (or this machine, for the browser test). Besides it, the
flags (`public/flags/`, drawn by `scripts/flags.ts` from the MIT-licensed `flag-icons`) and
the Rubik and Syne fonts are part of the site. The first site loaded both from outside
hosts (Google Fonts, flagcdn.com); it no longer does. The Content Security Policy
(`vite.config.ts`) enforces it, and the browser test fails if any request goes anywhere
else. A new host needs a reason, a change to the policy and a line here.

## The server (issue #1)

The Worker `douze-api` (`worker/`, on Cloudflare; the standard is the template's `SERVER.md`)
keeps the groups in a D1 database (`worker/migrations/`): each group's name, its members'
names and roles, the hashes of their devices' tokens and of the invitation, the log, and
each year's stages (countries, when they close, the official result) and members'
predictions of them. Nothing
else: no address, no e-mail, no account.

- **Who is who.** Level 2 of `SERVER.md`, without Google for now: a device holds a 256-bit
  token, given when it opens or joins a group, sent as `Authorization: Bearer`. The server
  keeps only its SHA-256 hash and compares in constant time (`shared/tokens.ts`). The same
  for the invitation, sent in an `X-Invite` header, never in an address the server logs.
- **On the device.** `eurorank:groups` holds, per group, the token, the invitation (so any
  member can pass the link on) and the names as last seen. Anyone with the phone, or a
  script on the same origin, can act as that member: the known limit below. Leaving a
  group, or being released, ends the token on the server.
- **Who may do what.** One table of roles and actions, deny by default, checked before
  anything else in every handler (`shared/capabilities.ts`, `worker/src/auth.ts`).
- **Every value checked.** Bodies are parsed against closed shapes, unknown fields refused
  (`shared/groups.ts`); names cleaned of control and direction characters, 1 to 30
  characters (`shared/names.ts`); ids and secrets by their exact form.
- **Predictions stay private until a stage closes.** The server answers a member's own
  prediction and only the list of who has finished; everyone's only once the stage's close
  time, by the server's clock, has passed (`worker/src/years.ts`). A prediction is refused
  once it has. Only managers set stages, close them and enter results; only the owner imports the archive (`worker/src/archive.ts`), and a result only
  once its stage has closed.
- **Limits** (`shared/limits.ts`, `shared/config.ts`), counted in the database
  (`worker/src/rate.ts`): bodies 32 KiB; 40 members a group, five phones a player; five new
  groups a day from one address and 2000 in all; ten joins or wrong secrets an hour from
  one address; 60 writes a minute. The log keeps 1000 entries a group for a year.
- **Answers.** Deny by default: an unknown path is a plain 404, an unknown method a 405.
  CORS answers the site's own origins only (`ALLOWED_ORIGINS` in `wrangler.jsonc`). An
  unexpected error is a plain 500 that names nothing; the log has one line per request,
  with ids replaced by `:id`, no address, header or body. Every answer is `no-store`,
  `nosniff` and sent with no referrer.
- **Deploying.** The deploy token (`CLOUDFLARE_API_TOKEN`, Workers Scripts and D1, edit) and
  the account id are repository secrets, used only by `deploy-worker.yml`, which has
  read-only permissions and keeps no checkout token; it creates the database once and
  applies the migrations before the code that needs them.

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
| Seeing predictions before closing  | Others' predictions are left out of every answer until the close time has passed       | unit (`worker/src/years.test.ts`), e2e                    |
| Changing a prediction after it     | The server refuses a prediction once its stage has closed, by its own clock            | unit (`worker/src/years.test.ts`)                         |
| A stranger in a group              | An invitation secret; a new link ends the old; joins and wrong secrets capped          | unit (`worker/src/groups.test.ts`), e2e                   |
| Taking over a manager's name       | Only players' names can be taken over; a manager's never                               | unit (`worker/src/groups.test.ts`), e2e                   |
| Flooding the server                | Sizes, counts and rates capped in the database                                         | unit (`worker/src/groups.test.ts`)                        |
| A secret left in the address bar   | The invitation address is replaced once joined; tokens never travel in an address      | e2e                                                       |

## Known limits, accepted

- Devices do not sync: a final entered on one phone stays there; groups share their members
  and their predictions, not yet the results (issue #1).
- A player who leaves a group takes their predictions with them; one released keeps them.
- A member is their phone: whoever holds it, or a token copied from its storage, acts as
  that member until the token is released. A manager's name cannot be taken over by the
  invitation, but anyone with the link can join as a player; the owner renews the link
  when it has gone too far. Signing in with Google, first for managers, is the next level
  (`SERVER.md`).
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
