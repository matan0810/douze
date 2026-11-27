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

## Threats and what answers them

| Threat                      | Answer                                                                                 | Checked by                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Script injection (XSS)      | Text is rendered as React text; CSP allows only the site's own files; Trusted Types on | e2e: CSP present, no violations                           |
| Tampered saved choices      | Parsed and checked; a bad value means the default                                      | unit (`storage.test.ts`, `game.test.ts`, `games.test.ts`) |
| A disguised download name   | ASCII names only, no path or direction characters                                      | unit (`download.test.ts`), e2e                            |
| A compromised dependency    | Few runtime dependencies; `npm audit` blocks high advisories; no install scripts       | CI                                                        |
| A compromised workflow step | Read-only permissions by default; checkouts keep no token                              | review                                                    |
| A forged release            | Releases only from the deploy workflow; version, commit and date checked               | unit (`changelog.test.ts`)                                |

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
