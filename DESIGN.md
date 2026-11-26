# EuroRank: design

What the product does and why: the rules, the numbers and the behaviour. A change to any of
them is made here first (CLAUDE.md, section 4).

## 1. Scope

| In                                                        | Out                                  |
| --------------------------------------------------------- | ------------------------------------ |
| The grand final of each year, from 2026                   | Semi-finals, jury and televote split |
| Predictions of the full order, the result, the table      | Accounts, a server, live data feeds  |
| Predictions and groups passed from phone to phone by link | Syncing devices automatically        |
| Statistics of each final and of all the years             | Betting odds, outside data           |
| Hebrew (RTL) and English                                  | Other languages                      |

The site has no server. The archive (`src/data/`) is what the repository says; everything
else lives on the device that entered it and travels only in links people send.

## 2. Look

The owner's choice is the first site's look, kept as it was: a night sky in deep purple
with twinkling stars and golden sparkles, glass panels, a shimmering gold for the name and
for winners, purple to pink for actions, medals for the first three, emoji as icons. Three
new directions were drawn and turned down (2026-11-26); the look is not to be redesigned
without the owner asking.

- **Tokens and shared forms** are in `src/styles/global.css`: colours, the glass panels
  (`glass`, `glass-purple`, `glass-gold`), gradient text (`text-gold`, `text-purple`),
  buttons (`btn-primary`, `btn-gold`, `btn-ghost`, `btn-soft`, `btn-danger`), inputs and
  notes. Components use them and their own CSS Modules, with logical properties.
- **Type**: Heebo (variable, bundled, Hebrew and Latin subsets only, so emoji keep their
  colour). Titles 900, headings 700, text 400.
- **Colours of closeness**, everywhere a predicted place meets the actual one: green for
  exact, yellow within 2, orange within 5, red beyond (`closeness.ts`).
- **Medals**: gold, silver and bronze for the first three of any ranking; the leader of a
  table wears a crown.
- **Motion**: panels rise softly into place, the table's bars grow, the title text
  shimmers, stars twinkle. All of it stops with reduced motion.
- **Phones**: the bar keeps only the emoji of each link below 900 px; the results page puts
  the table above the official order below 1024 px.

## 3. Scoring

For every country in the final, a prediction earns **10 points less one for each place it
is off**, never below zero. Placing the **winner exactly earns 15 more, the runner-up 10,
and third 5**. A final of 25 countries is worth at most 25 × 10 + 30 = **280**.

- Only a **complete** prediction is scored: every finalist, each exactly once.
- The table is ordered by points; a tie goes to more exact places, then to more places
  within one. Players still level share the rank.
- The rule lives in `src/domain/scoring.ts`; its tests include the real 2026 final
  (Matan 158, Adi 145, Ori 139).

## 4. Screens

- **Home**: the name, the last final's winner, the way to the players and the results, a
  way for a friend to fill in their own prediction, and how scoring works.
- **Players** (per final): add a player, enter or edit their prediction (type a name in
  Hebrew or English and press Enter; drag, or use the handle with the arrow keys, to
  reorder), share it, delete it. Two links invite the group (section 5). The countries in
  the final can be changed from the catalogue; a device whose data differs from the archive
  can go back to it.
- **Results** (per final): the official order, entered like a prediction, and the table.
  _Live mode_ is for the night itself: it starts from the group's average prediction, the
  order is dragged to follow the scoreboard as votes come in, and the table follows at
  once; nothing is saved until Save. Each player opens their breakdown, country by
  country. The table can be shared as a picture (1080 px wide, in the page's language).
- **Statistics** (per final, once there is a result and a complete prediction):
  - _The surprise_ and _the letdown_: the countries that finished furthest above and below
    our average prediction.
  - _Wisdom of the crowd_: our average prediction, scored, and where it would have
    finished. Countries level on average keep the order of the field.
  - _The prophet_: who placed the winner highest.
  - _Agreement_ and _disagreement_: the smallest and largest spread of predicted places.
  - _Country by country_: every prediction against the result, in the closeness colours.
  - _Head to head_: for every pair, in how many countries each was closer.
- **All the years**: each final with its winner, and the all-time table by titles, then
  average share of the maximum, then points. The same person is joined across years by
  their archive id; players added on a device, by name.
- **My prediction**: a friend orders the countries and sends the result as a link. The
  draft and the name stay on their device until sent.
- **New final**: a year and its countries from the catalogue.

## 5. Links

A link carries predictions with no server; everything is after `#`, so it never reaches
GitHub's servers. A country is one character, its place in `countries.json` in base 62
(the catalogue only grows at its end, and a test holds it to that).

| Link                                  | Carries                                 | Opens               |
| ------------------------------------- | --------------------------------------- | ------------------- |
| `#/<year>/predict?f=<field>`          | The countries of the final              | My prediction       |
| `#/predict?y=<year>&p=<order>-<name>` | One complete prediction                 | Add it to my group  |
| `#/join?y=&f=&r=&p=…`                 | The field, the result, every prediction | Keep the group here |

- A received prediction replaces the prediction of the player of the same name (in either
  language), or adds a player.
- A received group replaces this device's final of that year, after asking if it holds
  changes of its own. Archive players are recognised by name and keep their identity.
- Limits: 40 countries, 40 players, names of 30 characters, 4000 characters of query.
  Anything else, or anything malformed, shows "this link is broken".

## 6. Addresses

`#/` home, `#/<year>` results, `#/<year>/results` results in edit mode,
`#/<year>/players`, `#/<year>/stats`, `#/<year>/player/<id>` a breakdown over the table,
`#/<year>/predict` my prediction, `#/history`, `#/new`, and the links of section 5. Unknown
addresses show home and are rewritten. The first site's paths (`/euro-rank/players`,
`/euro-rank/results`) reach the site through Pages' 404 page and open their screens.

## 7. On the device

Each final changed on this device is saved under its own key, and forgotten as soon as it
matches the archive again, so later corrections to the archive reach it. What the first
site saved is read once, moved to the new keys and removed. Details in `SECURITY.md`.
