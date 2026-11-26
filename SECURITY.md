# Security

What there is to protect, what the site stores and talks to, and how each threat is answered.
Update it whenever any of these change (CLAUDE.md, section 4).

## What the site stores on a device

| Key                             | What                                                |
| ------------------------------- | --------------------------------------------------- |
| `eurorank:language`             | The language chosen in the header                   |
| `eurorank:game:<year>`          | A final changed, created or received on this device |
| `eurorank:my-name`              | The name typed on "my prediction"                   |
| `eurorank:my-prediction:<year>` | The draft of "my prediction" for that year          |

Every value read back is parsed and checked (`src/hooks/storage.ts`,
`src/domain/game.ts`, `parseStoredGame`), never cast: unknown countries and repeats are
dropped, a bad entry is ignored. The first site's keys (`eurorank_state_he_<year>`) are
read once, moved and removed.

## Links

Predictions travel in links (DESIGN.md, section 5), after `#`: they never reach a server,
and they carry nothing but names and orders. Anyone can make a link, so a received link is
untrusted input: it is parsed against closed lists (catalogue characters, year range),
capped (40 countries, 40 players, 30-character names, 4000 characters), its names are
cleaned of control and direction marks, and it changes nothing until the visitor presses
the button. Names are shown as React text, never as HTML.

## Hosts

The site talks to no host but its own: the flags (`public/flags/`, drawn by
`scripts/flags.ts` from the MIT-licensed `flag-icons`) and the Heebo font are part of the
site. The first site loaded both from outside hosts (Google Fonts, flagcdn.com); it no
longer does. The Content Security Policy (`vite.config.ts`)
enforces it, and the browser test fails if any request leaves the site. A new host needs a
reason, a change to the policy and a line here.

## Threats and what answers them

| Threat                      | Answer                                                                                 | Checked by                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Script injection (XSS)      | Text is rendered as React text; CSP allows only the site's own files; Trusted Types on | e2e: CSP present, no violations                           |
| Tampered saved choices      | Parsed and checked; a bad value means the default                                      | unit (`storage.test.ts`, `game.test.ts`, `games.test.ts`) |
| A crafted link              | Parsed against closed lists, capped, cleaned; nothing changes without a press          | unit (`links.test.ts`), e2e (broken link)                 |
| A disguised download name   | ASCII names only, no path or direction characters                                      | unit (`download.test.ts`), e2e                            |
| A compromised dependency    | Few runtime dependencies; `npm audit` blocks high advisories; no install scripts       | CI                                                        |
| A compromised workflow step | Read-only permissions by default; checkouts keep no token                              | review                                                    |
| A forged release            | Releases only from the deploy workflow; version, commit and date checked               | unit (`changelog.test.ts`)                                |

## Known limits, accepted

- A link is as private as the chat it is sent in: anyone holding a group link sees every
  prediction in it, and anyone can make a link in someone else's name. Among friends that
  is accepted; nothing in a link is secret.
- Devices do not sync: two people editing the same final see their own copies until one
  sends the other a group link.

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
