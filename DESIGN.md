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

**A game show on velvet** (chosen by the owner on 2026-11-27). The night of "light on
velvet" stays: the velvet room, the mirror ball's reflections, the brand, the eyebrows and
the Syne numerals. On it, the site plays: every player is a game piece with a colour and a
token, shapes are rounded, titles and scores heavy and rounded, buttons press like keys,
stickers reward, and the table lands and counts up like a scoreboard on the night. Surfaces
stay clear on the night (the owner's "background like A"): colour lives in the pieces, the
outlines, the numbers and the stickers, never in a filled card. Before it: the first site's
look, then "light on velvet" (precise, 2026-11-26), which the owner found too serious for a
game. It is not to be redesigned without the owner asking.

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
  elsewhere; the share image is headed by the wordmark. The repository and the address are
  `douze` since 2026-11-26 (first `euro-rank`; the old address no longer answers, and Pages
  cannot redirect it). The keys saved on devices keep the first name (`eurorank:…`).

- **Tokens and shared forms** are in `src/styles/global.css`: the night, the brand
  gradient and its hairline, the metals, the pieces, the closeness colours, the fonts, the
  radii; and the forms `frame`, `text-brand`, `eyebrow`, buttons (`btn-primary` for the one
  main action, `btn-line` for the rest, `btn-quiet` for a step back), `input`, `note`, and
  the entrances `rise`, `fade`, `land` and `slapped` (shared classes: an animation named
  inside a CSS Module is renamed locally and never runs). Components use them and their own
  CSS Modules, with logical properties.
- **Game pieces.** Each player has a colour (`src/domain/pieces.ts`): the archive's
  players name theirs in `players.json` (Matan pink, Adi cyan, Ori violet); a player added
  on a device takes the first one free in that final. Their token is a disc in that colour
  with their initial; their row is outlined in it, their bar and points are in it, on every
  screen and in the share image.
- **Shapes.** Corners of 14 px (`--radius`), rows and cards 18 to 22 px, stickers and
  chips round (`--pill`). Buttons stand on a 4 px shadow and go down when pressed.
- **Colour.** Velvet black and ivory, the players' pieces, and the brand gradient (pink,
  violet, gold) where the eye should go: the main action, the leader's outline, the tab
  shown, the first word of a title, the eyebrow. Gold, silver and bronze only for the first
  three places.
- **Closeness**, wherever a predicted place meets the actual one, in the brand's light:
  exact in gold, within 2 in pink, within 5 in violet, beyond in ash (`closeness.ts`, the
  `--exact`, `--near`, `--off`, `--far` tokens).
- **Type.** Rubik (variable, bundled): rounded and friendly, regular for text and heavy
  (800) for titles, scores and big numbers (`--font`, `--font-display`, `--display-weight`).
  Syne (`--font-brand`) for the wordmark, the eyebrows and large numerals only (its digits
  are unreadable small). Earlier: Noto Sans Hebrew, thin and narrow, for "light on velvet".
- **Eyebrows**: a spaced Latin line above every title, the same in both languages
  (_LEADERBOARD · 2026_, _THE PLAYERS · 2026_, _STATISTICS · 2026_, _ALL THE YEARS_).
- **Places**: two-digit numerals. In the table, large in Syne, outlined, the first three
  filled with their metal; in lists, small in the text face, the first three in their
  metal colour.
- **Icons**: thin lines with square ends (`src/ui/Icon.tsx`). Flags are the only pictures
  in colour; a hairline ring keeps white ones visible.
- **The room**: a spotlight from above and the square reflections of the ball, slowly
  catching the light, instead of stars.
- **Stickers** of reward on the table (rules in section 4), slapped on at a tilt; and the
  final's facts stuck around the wordmark on the home page (countries, players, the year).
- **Motion**: the table's rows land from the last place to the first, 0.35 s apart, with a
  bounce; the points count up as they land; the stickers are slapped on after; when the
  leader lands, a burst of the ball's facets falls over the screen (once per showing of the
  table, 4 seconds). Elsewhere content rises a few pixels into place, and live mode blinks
  a pink "on air" light. All of it stops with reduced motion: numbers appear at once.
- **Phones**: the bar keeps only the icon of each link below 900 px, and below 420 px the
  home link steps aside (the name leads home) and the wordmark is smaller; the results page
  puts the table above the official order below 1024 px.

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
- **Stickers** (`src/domain/badges.ts`), at most two per player, in this order: _Champion!_
  for first place; _So close!_ for second within 15 points of first; _N spot on_ for the
  most exact places (at least two); _Prophet_ for whoever put the winner highest. In 2026:
  Matan champion and prophet, Adi so close (13 behind), Ori 3 spot on.
- **All the years**: each final with its winner, and the all-time table by titles, then
  average share of the maximum, then points. The same person is joined across years by
  their archive id; players added on a device, by name.
- **New final**: a year and its countries from the catalogue.

## 5. Addresses

`#/` home, `#/<year>` results, `#/<year>/results` results in edit mode,
`#/<year>/players`, `#/<year>/stats`, `#/<year>/player/<id>` a breakdown over the table,
`#/history`, `#/new`. Unknown
addresses show home and are rewritten, and so does an unknown path under the site: Pages'
404 page is a copy of the site.

## 6. On the device

Each final changed on this device is saved under its own key, and forgotten as soon as it
matches the archive again, so later corrections to the archive reach it. What the first
site saved is read once, moved to the new keys and removed. Details in `SECURITY.md`.
