# EuroRank: design

What the product does and why: the rules, the numbers and the behaviour. A change to any of
them is made here first (CLAUDE.md, section 4).

## 1. Scope

| In                                                   | Out                                  |
| ---------------------------------------------------- | ------------------------------------ |
| The grand final of each year, from 2026              | Semi-finals, jury and televote split |
| Predictions of the full order, the result, the table | Accounts, a server, live data feeds  |
| Statistics of each final and of all the years        | Betting odds, outside data           |
| Hebrew (RTL) and English                             | Other languages                      |

The site has no server. The archive (`src/data/`) is what the repository says; everything
else lives on the device that entered it. Sharing between phones, by link or by a server,
waits for a server (issue #1): links without one were tried in 1.1.0 and removed.

## 2. Look

The owner's choice is the first site's look, kept as it was: a night sky in deep purple
with twinkling stars and golden sparkles, glass panels, a shimmering gold for winners,
purple to pink for actions, medals for the first three, emoji as icons. Three new
directions were drawn and turned down (2026-11-26); the look is not to be redesigned
without the owner asking.

**The brand: Douze.** The name comes from "douze points", the twelve points, the phrase
everyone knows from the Eurovision scoreboard. It is written in Latin letters in both
languages (said דוּז), with the slogan **מי באמת מבין באירוויזיון?** (_Who really knows
Eurovision?_). Chosen by the owner on 2026-11-26, from four named directions and three ways
of joining the winning two.

- **The mark** is a mirror ball: the stage's disco ball and a crystal ball for predicting,
  in the sky's purples, pinks and gold, lit from the top left (`scripts/ball.ts`).
- **The wordmark** is _Douze_ in Syne 800 with the mirror ball for its O, always left to
  right: pink into the ball, purple out of it, then gold (`src/ui/Wordmark.tsx`, the
  `--brand-*` tokens). It is the name in the bar, in every state, and the title of the home
  page, followed there by the slogan.
- **Its files** are drawn by `node scripts/brand.ts` and committed: the ball and the
  favicon (SVG), the home-screen icons (180, 192, 512 px) and the card a chat shows for the
  site's address (1200 × 630, JPEG to stay small). The same card for every address: there
  is no server to make one per page (issue #1).
- The tab is titled _Douze · the slogan_ on the home page and _screen · final · Douze_
  elsewhere; the share image is headed by the wordmark. The repository and the address
  keep the first name, `euro-rank`, and so do the keys saved on devices.

- **Tokens and shared forms** are in `src/styles/global.css`: colours, the glass panels
  (`glass`, `glass-purple`, `glass-gold`), gradient text (`text-gold`, `text-purple`),
  buttons (`btn-primary`, `btn-gold`, `btn-ghost`, `btn-soft`, `btn-danger`), inputs and
  notes. Components use them and their own CSS Modules, with logical properties.
- **Type**: Heebo (variable, bundled, Hebrew and Latin subsets only, so emoji keep their
  colour). Titles 900, headings 700, text 400. Syne 800 for the wordmark only.
- **Colours of closeness**, everywhere a predicted place meets the actual one: green for
  exact, yellow within 2, orange within 5, red beyond (`closeness.ts`).
- **Medals**: gold, silver and bronze for the first three of any ranking; the leader of a
  table wears a crown.
- **Motion**: panels rise softly into place, the table's bars grow, the title text
  shimmers, stars twinkle. All of it stops with reduced motion.
- **Phones**: the bar keeps only the emoji of each link below 900 px, and below 420 px the
  home link steps aside (the name leads home) and the wordmark is smaller; the results page puts
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

- **Home**: the name, the last final's winner, the way to the players and the results, and
  how scoring works.
- **Players** (per final): add a player, enter or edit their prediction (type a name in
  Hebrew or English and press Enter; drag, or use the handle with the arrow keys, to
  reorder), delete it. The countries in
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
- **New final**: a year and its countries from the catalogue.

## 5. Addresses

`#/` home, `#/<year>` results, `#/<year>/results` results in edit mode,
`#/<year>/players`, `#/<year>/stats`, `#/<year>/player/<id>` a breakdown over the table,
`#/history`, `#/new`. Unknown
addresses show home and are rewritten. The first site's paths (`/euro-rank/players`,
`/euro-rank/results`) reach the site through Pages' 404 page and open their screens.

## 6. On the device

Each final changed on this device is saved under its own key, and forgotten as soon as it
matches the archive again, so later corrections to the archive reach it. What the first
site saved is read once, moved to the new keys and removed. Details in `SECURITY.md`.
