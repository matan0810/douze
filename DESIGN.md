# EuroRank: design

What the product does and why: the rules, the numbers and the behaviour. A change to any of
them is made here first (CLAUDE.md, section 4).

## 1. Scope

| In                                                    | Out                        |
| ----------------------------------------------------- | -------------------------- |
| The final and the semi-finals of each year, from 2026 | Jury and televote split    |
| Predictions of the full order, the result, the table  | Accounts, live data feeds  |
| Statistics of each final and of all the years         | Betting odds, outside data |
| Hebrew (RTL) and English                              | Other languages            |

The archive (`src/data/`) is what the repository says; everything else lives on the device
that entered it. Sharing between phones comes with the server (issue #1, the template's
`SERVER.md`), in phases: groups first (section 4, _Groups_), then predictions, results and
the live night from every phone. Links without a server were tried in 0.2.0 and removed. A
build without the server's address (`VITE_API_URL`) has no groups at all: no link, no screen.

## 2. Look

**The party** (chosen by the owner on 2026-11-27, option 4 of four rendered colour
directions). The night is the arena on the evening of the final: violet, with pink light
from the side and blue from below pouring in (`--light-*`), over which the mirror ball's
reflections still catch the light. On it, the site plays: every player is a game piece
with a colour and a token, and their card is filled with that colour and stands on it like
a piece on a board; shapes are rounded, titles and scores heavy, buttons press like keys,
stickers reward, and the table lands and counts up like a scoreboard on the night. Before
it: the first site's look, "light on velvet" (precise, 2026-11-26), and "a game show on
velvet" (clear surfaces on a black night, earlier on 2026-11-27), which the owner wanted
more playful still. It is not to be redesigned without the owner asking.

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
- The tab is titled _Douze_ on the home page and _screen · final_ elsewhere, with no name
  beside Hebrew words (a Latin name there scrambles the tab's order; the ball icon says whose
  it is); the share image is headed by the wordmark. The repository and the address are
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
  with their initial; their card (`piece-card`) is edged in it, filled with a fifth of it
  and stands on a darker step of it; their bar is in it and their points stand white on
  it, on every screen and in the share image. The leader's card is edged in gold
  (`piece-card-first`).
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
  (_LEADERBOARD · 2026_, _THE PLAYERS · 2026_, _SEMI-FINAL 1 · 2026_, _THE SEASON · 2026_,
  _SETTINGS · 2026_, _STATISTICS · 2026_, _ALL THE YEARS_).
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
  table, 4 seconds). Elsewhere content rises a few pixels into place. All of it stops with reduced motion: numbers appear at once.
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
- **Joker**, in a year whose settings switch it on: each player stars one country in their
  prediction, and its place points count twice (`JOKER_FACTOR`); its podium bonus does
  not. The most a prediction can earn rises by 10 (290 for 25 countries). 2026 has none.
- The rule lives in `src/domain/scoring.ts`; its tests include the real 2026 final
  (Matan 158, Adi 145, Ori 139).

**Semi-finals** (chosen by the owner on 2026-11-27). Each player picks the countries that
qualify (ten, or one fewer than the field if it is smaller) and one more in 11th place, a
reserve. Only the set counts, not the order: the semis' results are known before their
order is published.

- **2 points** for every pick that qualified, and **1 more** if the 11th place qualified.
  A semi of ten qualifiers is worth at most 21.
- A semi's own table shows these points only. The **season** adds the final and every
  semi, plus a **bonus of 5** for each perfect semi (all ten picks qualified); a stage a
  player did not predict counts nothing.
- A semi does not set the final's field: the host and the big five go straight to the
  final, so the final's countries and each semi's are set apart, on the year's settings. A
  country is in one semi at most.
- The rule lives in `src/domain/semis.ts` and `season.ts`; their tests use the real 2026
  semis (semi 1: Ori 18, Adi 15; semi 2: Ori 17, Matan 17; season: Matan 175, Ori 174,
  Adi 160).

## 4. Screens

- **Home**: the name, the last final's winner, a countdown to the next final whose date
  is set (_N days to the final_, then _tomorrow_ and _tonight_; by the device's own
  calendar), the way to the players and the results, and how scoring works.
- **Players** (per final): add a player, enter or edit their prediction (type a name in
  Hebrew or English and press Enter; drag, or use the handle with the arrow keys, to
  reorder), delete it. Each player shows a chip per semi, lit once their pick is complete.
- **Results** (per final): the official order and the table, both read only. A result is a
  fact, not something a device edits (the owner, 2026-11-28): it comes from the archive
  (`src/data/`), or, in a group, from a manager (section 4, _Groups_); a result saved on a
  device by an older release is ignored, and one carries over from the archive only for the
  same countries (`withArchiveResults`). There is no live mode, and no result without a
  group. Arrows of rank change on the night wait for a live data source (issue #3). Each
  player opens their breakdown, country by country. The table can be shared as a picture (_Share the table_; 1080 px wide, in the page's
  language).
- **Planning mode** (per final, from the players page): a prediction built while
  watching. The songs come up in the running order (set on the year's settings; without
  one, in the order of the field). Each goes into one of four drawers, _Could win_, _Top
  ten_, _Middle_, _Bottom_, then into its place among the songs already in that drawer;
  the drawers, top to bottom, are the prediction, saved as it like any other and then
  dragged into shape. It judges the place a song will get, not how much one likes it (a
  ranking by liking is a separate idea, issue #4). A song missed while watching is
  skipped and comes back after the last one, marked as returning. The last song placed can be
  taken back; a plan in progress is kept on the device until it is saved (`plan.ts`).
- **The reveal** (per final, once there is a table): the places hidden, then told from
  the last to the first, one tap at a time (players level on a place together). Before the
  first place the button's light beats like a drum; the champion's card lands with
  _Douze points!_ and the ball's facets. Reached from the table.
- **Stages**: a year with semis shows chips above the table, _Final · Semi-final 1 ·
  Semi-final 2 · Season_, and a link to the year's settings on every one of them.
- **Semi-final** (per year and semi): who qualified, lit (read only, like the final's
  result); each
  player's pick, made by tapping (the first ten taps go through, the next is 11th; a tap on
  a chosen country takes it back); and the semi's table, landing like the final's, with
  each pick's flag lit if it went through and faded if not.
- **Season**: the final, each semi, the bonus and the total, by total.
- **Settings** (per year): the countries of the final and of each semi, the number of semis
  (none, one or two; removing one asks first) and the way back to the archive. The players
  page links here to change the final's countries. And the game: whether the semis and the
  final add up to a season table (on by default; off for 2026, where not everyone
  predicted every stage), whether players have jokers (off by default; section 3), the
  host country (2026: Austria), the date of the final (for the countdown) and its running
  order (for planning mode).
- **Statistics** (per final, once there is a result and a complete prediction):
  - _The surprise_ and _the letdown_: the countries that finished furthest above and below
    our average prediction.
  - _Wisdom of the crowd_: our average prediction, scored, and where it would have
    finished. Countries level on average keep the order of the field.
  - _The prophet_: who placed the winner highest.
  - _Agreement_ and _disagreement_: the smallest and largest spread of predicted places.
  - _What your prediction says about you_, a card per player (`profile.ts`): _top-ten
    hits_ (of the real top ten, how many were in theirs: 2026 Matan 9, Adi and Ori 8);
    _the biggest miss_ (Adi and Ori Lithuania, Matan Austria); _the bold call_, the place
    furthest from the group's average that came out closer than it (Matan's Germany: 23rd
    against our 18.3, and 23rd it was); and _top against bottom_, the average places off in
    the real top half and bottom half (Matan 3.25 at the top; Ori better at the bottom).
  - _What we learned about ourselves_: _taste twins_, the pair that predicted most alike
    and the pair furthest apart (Adi and Ori 2.6 places apart on average, Ori and Matan
    3.3); _the Israeli heart_, where each of us put Israel (`HOME`) against where it
    finished (2nd; we said 5, 5 and 7); _the host and the big five_, the countries in the
    final without a semi, each of us against the result (the United Kingdom last for all
    of us, and last; Austria, the host, 24th).
  - _Country by country_: every prediction against the result, in the closeness colours,
    with each country's _surprise_ (our average less its real place) and who was closest.
  - _Head to head_: for every pair, in how many countries each was closer.
- **Stickers** (`src/domain/badges.ts`), at most two per player, in this order: _Champion!_
  for first place; _So close!_ for second within 15 points of first; _N spot on_ for the
  most exact places (at least two); _Prophet_ for whoever put the winner highest. In 2026:
  Matan champion and prophet, Adi so close (13 behind), Ori 3 spot on. A semi's table
  gives the champion, _Perfect!_ for all ten qualifiers and _11th in_ when the reserve went
  through (at most two); the season's, the champion and _Perfect!_ for a perfect semi. In
  2026: semi 1 Ori champion, Adi 11th in; semi 2 Ori and Matan champions, both 11th in.
- **All the years**: each final with its winner, the all-time table by titles, then
  average share of the maximum, then points, and the _rivalries_: for every pair of us, in
  how many finals each finished above the other, like a fixture's score. The same person is joined across years by
  their archive id; players added on a device, by name.
- **New final**: a year and its countries from the catalogue.
- **Groups** (only when the build has a server): a group is the people who play together,
  each from their own phone, with no account (level 2 of `SERVER.md`: a person is their
  device). _My groups_ lists the groups this device belongs to and opens a new one with a
  name for it and one's own. The opener is its _owner_ and gets the group's invitation, a
  link with a secret; anyone with the link sees the group's name and picks a name to join
  as a _player_. Picking a player's name already in the group takes it over (a new phone);
  an owner's or an admin's name cannot be taken over. A player's phones are at most five;
  a sixth replaces the oldest. On the group's page: the members and their roles, the
  invitation (copy, or a new link that ends the old one), and what each role may do:
  - the owner names and removes _admins_, renews the link and deletes the group, typing
    its name to confirm;
  - an admin _releases_ a player (their phones leave, the name stays for them to take
    back) and reads the _log_: who joined, took over, left, was named or released, and when;
  - every member can leave; the owner cannot, while the group is theirs.

  Who may do what is one table (`shared/capabilities.ts`); the numbers (40 members, five
  groups a day from one address, names of up to 30 characters, …) are in
  `shared/limits.ts` and `shared/config.ts`.

- **A group's year** (`#/group/<id>/<year>`, `groupYear.ts`): a manager publishes a year
  from the group's page, as their phone has it: the final's countries, each semi's, and
  whether there are jokers, with the date of the final. Every member then enters their own
  prediction of each stage from their own phone, the same editors as on the device: the
  final's order (with a joker when the year has them) and each semi's ten and its eleventh.
  - **Open through the evening.** The point of the game is to rank while watching, so a
    prediction can change all through the show, until the results start to be read (the
    owner's rule, 2026-11-27). Then a manager taps _Close predictions now_. If no one does,
    a stage closes by itself: the final at 00:30 the night after its date, a semi at 23:50
    on its evening (Tuesday and Thursday before the final), on the manager's phone's clock,
    which is Israel's; that is when the votes start to be read. The server's clock decides.
  - Until a stage closes, each member sees only their own prediction and who has finished
    (a finished final has every country placed; a semi, its qualifiers and a reserve).
    Once it closes, everyone sees everyone's.
  - **The official result** of a closed stage is entered by a manager: the final's whole
    order, a semi's qualifiers. It starts from the manager's phone's copy when it has the
    same countries (the archive, for a past year). It is a fact, entered once; correcting
    it is there for a mistake, and only managers can (the owner, 2026-11-28). With it,
    everyone's table appears, scored by the rules of section 3. A phone's own copy of the
    year never stands in for the group's result.
  - **The archive is a group** (issue #6): the server seeds a standard group from the archive
    (`src/data/`, through `scripts/archiveSeed.ts` into `worker/seed/archive.sql`, applied on
    every deploy, ignoring whatever exists): its members are the archive's players, every
    archived year is closed with its result and everyone's prediction, and the owner is the
    archive's owner. It has no special mechanics. Its people join with the invitation, like
    any group, and pick their own name; a name no phone holds is theirs to claim, a manager's
    included (while a phone holds a manager's name it is never claimed; releasing an admin
    makes them a player again). The group then plays 2027 and beyond, with its history in
    place.
  - Publishing again updates the stages. A stage's countries can change until it closes;
    each prediction keeps what still fits. After that they stay. A group keeps up to 30
    years.

## 5. Addresses

`#/` home, `#/<year>` results (`#/<year>/results`, once an edit address, opens the same),
`#/<year>/players`, `#/<year>/stats`, `#/<year>/semi-1`, `#/<year>/semi-2`,
`#/<year>/season`, `#/<year>/settings`, `#/<year>/reveal`, `#/<year>/plan`, `#/<year>/player/<id>` a breakdown over the table,
`#/history`, `#/new`, `#/groups`, `#/group/<id>`, `#/group/<id>/<year>` and `#/group/<id>/<year>/semi-1` a group's year, `#/join/<id>/<secret>` an invitation (the
address is replaced by the group's page once joined, so the secret leaves the history). Unknown
addresses show home and are rewritten, and so does an unknown path under the site: Pages'
404 page is a copy of the site.

## 6. On the device

Each final changed on this device is saved under its own key, and forgotten as soon as it
matches the archive again, so later corrections to the archive reach it. What the first
site saved is read once, moved to the new keys and removed. Details in `SECURITY.md`.
