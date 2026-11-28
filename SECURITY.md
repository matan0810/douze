# Security

What there is to protect, what the site stores and talks to, and how each threat is answered.
Update it whenever any of these change (CLAUDE.md, section 4).

## What the site stores on a device

| Key                             | What                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `eurorank:language`             | The language chosen in the header                          |
| `eurorank:game:<year>`          | A final changed or created on this device, not its results |
| `eurorank:plan:<year>:<player>` | A plan in progress in planning mode, until it is saved     |
| `eurorank:session`              | The signed-in session: a token and the Google name         |
| `eurorank:invites`              | The invitation links this device made, per group           |

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

- **Who is who.** A Google account (level 3 of `SERVER.md`). The Worker runs the
  authorization-code flow with its own client secret, a secret of the Worker, never in the
  repository: the site only navigates to `/auth/google/start`, then Google, then back to the
  Worker, then home with a one-time code (valid two minutes, once, stored hashed) that the
  site exchanges for a session (a 256-bit token, 90 days, stored only as its hash, sent as
  `Authorization: Bearer`). The state is single-use and expires in ten minutes; the id
  token's issuer, audience, expiry, nonce and verified email are checked, and the return
  address must be one of the site's origins. No script from Google runs on the site, and the
  Content Security Policy does not change. What the database keeps of a person: Google's own
  id, the email and the name.
- **On the device.** `eurorank:session` holds the session token and the name;
  `eurorank:invites` holds, per group, the link its owner made, so the page can show it again.
  A script on the same origin could use the session: the known limit below. Signing out, or a
  session the server no longer knows, clears it.
- **Who may do what.** One table of roles and actions, deny by default, checked before
  anything else in every handler (`shared/capabilities.ts`, `worker/src/auth.ts`).
- **Every value checked.** Bodies are parsed against closed shapes, unknown fields refused
  (`shared/groups.ts`); names cleaned of control and direction characters, 1 to 30
  characters (`shared/names.ts`); ids and secrets by their exact form.
- **Predictions stay private until a stage closes.** The server answers a member's own
  prediction and only the list of who has finished; everyone's only once the stage's close
  time, by the server's clock, has passed (`worker/src/years.ts`). A prediction is refused
  once it has. Only managers set stages, close them and enter results, and a result only
  once its stage has closed.
- **Limits** (`shared/limits.ts`, `shared/config.ts`), counted in the database
  (`worker/src/rate.ts`): bodies 32 KiB; 40 members a group, ten groups an account; thirty sign-ins an hour from one address; five new
  groups a day from one address and 2000 in all; ten joins or wrong secrets an hour from
  one address; 60 writes a minute. The log keeps 1000 entries a group for a year.
- **Answers.** Deny by default: an unknown path is a plain 404, an unknown method a 405.
  CORS answers the site's own origins only (`ALLOWED_ORIGINS` in `wrangler.jsonc`). An
  unexpected error is a plain 500 that names nothing; the log has one line per request,
  with ids replaced by `:id`, no address, header or body. Every answer is `no-store`,
  `nosniff` and sent with no referrer.
- **The seeded archive group.** The archive (public data) is put in the database as a
  standard group on deploy (`worker/seed/archive.sql`, only `INSERT OR IGNORE`). Its owner's
  name waits for the email in the repository secret `ARCHIVE_OWNER_EMAIL` (put in at deploy,
  kept in the database lower-case and never shown) and goes to the Google account that signs
  in with that verified email; its invitation starts as a hash nobody knows, and the owner
  makes a link. A freed name can be claimed with the invitation, a freed admin is a player
  again.
- **Deploying.** The deploy token (`CLOUDFLARE_API_TOKEN`, Workers Scripts and D1, edit), the
  account id and the Google client's id and secret are repository secrets, used only by `deploy-worker.yml`, which has
  read-only permissions and keeps no checkout token; it creates the database once and
  applies the migrations before the code that needs them.

## Threats and what answers them

| Threat                             | Answer                                                                                                | Checked by                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Script injection (XSS)             | Text is rendered as React text; CSP allows only the site's own files; Trusted Types on                | e2e: CSP present, no violations                           |
| Tampered saved choices             | Parsed and checked; a bad value means the default                                                     | unit (`storage.test.ts`, `game.test.ts`, `games.test.ts`) |
| A disguised download name          | ASCII names only, no path or direction characters                                                     | unit (`download.test.ts`), e2e                            |
| A compromised dependency           | Few runtime dependencies; `npm audit` blocks high advisories; no install scripts                      | CI                                                        |
| A compromised workflow step        | Read-only permissions by default; checkouts keep no token                                             | review                                                    |
| A forged release                   | Releases only from the deploy workflow; version, commit and date checked                              | unit (`changelog.test.ts`)                                |
| A request the server should refuse | Deny by default; origin, size and method checked; errors name nothing                                 | unit (`worker/src/app.test.ts`), the real runtime         |
| A guessed or leaked secret         | 256-bit tokens, hashes only stored, constant-time comparison                                          | unit (`shared/server.test.ts`)                            |
| A role doing too much              | One table of capabilities, deny by default, walked cell by cell                                       | unit (`shared/server.test.ts`)                            |
| Seeing predictions before closing  | Others' predictions are left out of every answer until the close time has passed                      | unit (`worker/src/years.test.ts`), e2e                    |
| Changing a prediction after it     | The server refuses a prediction once its stage has closed, by its own clock                           | unit (`worker/src/years.test.ts`)                         |
| A stranger in a group              | An invitation secret; a new link ends the old; joins and wrong secrets capped                         | unit (`worker/src/groups.test.ts`), e2e                   |
| Taking someone's name              | A name an account holds is never offered or claimed; only a free name is claimed                      | unit (`worker/src/groups.test.ts`), e2e                   |
| A forged or replayed sign-in       | Single-use state; issuer, audience, expiry, nonce and verified email checked; return only to the site | unit (`worker/src/google.test.ts`)                        |
| A session token in an address      | Only a two-minute one-time code travels there; it becomes a session once, then is gone                | unit (`worker/src/google.test.ts`), e2e                   |
| Flooding the server                | Sizes, counts and rates capped in the database                                                        | unit (`worker/src/groups.test.ts`)                        |
| A secret left in the address bar   | The invitation address is replaced once joined; tokens never travel in an address                     | e2e                                                       |

## Known limits, accepted

- Devices do not sync: a final entered on one phone stays there; groups share their members
  and their predictions, not yet the results (issue #1).
- A player who leaves a group takes their predictions with them; a name that is freed keeps them.
- A member is their Google account: whoever holds the session on a device, or a copy of the
  token from its storage, acts as that member until the session ends. A freed name can be
  claimed by anyone with the invitation, so the owner renews the link when it has gone too
  far. A person who loses access to their Google account loses their name in the groups.
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
