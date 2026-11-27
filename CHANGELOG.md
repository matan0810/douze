# Changelog

All changes a visitor or the owner would notice are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and versions follow
[Semantic Versioning](https://semver.org/).

Version 1.0.0 was never numbered at the time. It was reconstructed from the git history and
the deploy runs: the one state of `master` that reached the live site as a working site, on
2026-05-18, by a manual deploy to the old `gh-pages` branch.

## [Unreleased]

### Added

- Predictions from every phone, in a group: a manager publishes a year from the group's
  page (its countries, semis and jokers as on their phone, and the date of the final), and
  everyone enters their own final and semi picks from their own phone. Predictions stay
  open through the show, until the results start to be read: then a manager closes them
  (or the stage closes by itself after the show). Until then each sees only their own and
  who has finished; after, everyone's.
- The official result in a group: once a stage has closed, a manager enters it (starting
  from their phone's copy when it has one), and everyone's table appears. Only managers
  can enter or correct it.

## [1.4.0] - 2026-11-27

### Added

- Groups, the first part of the server (issue #1): open a group from your phone and send
  its link; friends join from theirs with a name, or take their name back from a new
  phone. The opener names admins, renews the link and can delete the group; admins
  release a player's phones and read the group's log; anyone can leave. No account: each
  phone is its member. Shown only once the server is deployed and its address set.
- The server behind it: a Cloudflare Worker with a database, roles checked against one
  table, secrets kept only as hashes, and limits on everything; deployed from `master`
  once the Cloudflare secrets exist.
- The 2024 and 2025 finals, from the group's own messages: everyone's prediction of the
  final, Matan's picks for semi-final 1 of 2024, and the picks for both semi-finals of 2025
  (Ori and Matan for the first, Ori for the second), with the official results of the finals
  and of the semi-finals. 2024: Ori 174, Adi 149, Matan 128. 2025: Ori 149, Matan 143. Ori
  has won two titles, Matan one. Neither year has a season table, since not everyone
  predicted every stage.

### Fixed

- Years before 2026 had no address of their own and fell back to the home page. A year now
  opens at its own address, back to the first contest in 1956.
- On an Android home screen the icon was the mirror ball on a white plate. It now fills the
  icon, on its night sky, whatever shape the phone cuts it to.

### Changed

- The browser tab is titled _Douze_ on the home page and by the page and the year elsewhere,
  so the Latin name no longer scrambles the order of the Hebrew words.

## [1.3.0] - 2026-11-27

### Added

- The semi-finals: each player picks the ten countries that go through and one more in
  11th place; 2 points for every pick that qualified and 1 more if the 11th did. Each semi
  has its own table, where every pick shows lit or faded by whether it went through.
- The season table: the final and the semi-finals added up, with a 5-point bonus for a
  perfect semi-final.
- The 2026 semi-finals: who qualified, and the picks known so far (Ori in both, Adi in the
  first, Matan in the second).
- New statistics of the final: a card per player (top-ten hits, the biggest miss, the
  bold call, top against bottom), taste twins, the Israeli heart, the host and the big
  five, and each country's surprise and who was closest to it.
- Rivalries on the all-years page: for every pair of us, who finished above whom, final by
  final.
- Planning mode: build a prediction while watching. Each song, in the running order,
  goes into a drawer (could win, top ten, middle, bottom) and then into its place there;
  the drawers become the prediction. A song missed while watching can be skipped and comes
  back at the end. A plan in progress survives a reload.
- The reveal ceremony: the table told from the last place to the first, one tap at a
  time, with a drum roll before the first place and _Douze points!_ for the champion.
- Stickers on the semi-final and season tables: the champion, _Perfect!_ for all ten
  qualifiers, and _11th in_ when the 11th place went through too.
- A countdown on the home page to the next final whose date is set.
- Jokers, switched on in a year's settings: each player stars one country in their
  prediction of the final, and the points for its place count twice.
- Hungary and Bosnia and Herzegovina join the countries to choose from: every country of
  the last ten contests but Russia and Belarus is there for a new season.
- Each year knows its host country (2026: Austria), set in the year's settings.
- A settings page for each year: the countries of the final and of each semi-final, set
  separately, since the host and the big five go straight to the final; the number of
  semi-finals; whether they add up to a season table (off for 2026, where not everyone
  predicted every stage); the date of the final and its running order; and the way back to
  the archive.

### Changed

- A new look, "the party": the night is lit like the arena on the evening of the final,
  violet with pink and blue light pouring in, and every player's card is filled with their
  colour and stands on it like a game piece, on every screen and in the picture of the
  table.
- The button that downloads the table as a picture is now called _Share the table_.
- Douze feels like a game: every player has a colour and a token of their own, on every
  screen and in the image of the table; rounded shapes and a rounded, heavy typeface
  (Rubik); buttons that press like keys; and stickers of reward on the table: _Champion!_,
  _So close!_, the most exact places, and the _Prophet_ who put the winner highest.
- The table lands like a scoreboard on the night: from the last place to the first, the
  points counting up, the stickers slapped on, and a burst of the mirror ball's facets for
  the winner. All of it stays still for anyone who asked their device for less motion.
- The home page wears the final's facts as stickers around the name.

## [1.2.0] - 2026-11-27

A new name, a new address: the site is Douze, at https://matan0810.github.io/douze. Breaking
the old address would make this a major version; the owner chose a minor one, since the
site had not been in real use yet.

### Changed

- A new look, "light on velvet", made for Douze: a velvet night whose only colour is the
  light of the mirror ball. Hairlines instead of boxes and sharp corners; thin, large titles
  under a spaced English line; the table as a scoreboard, with large numerals for the places
  (the first three in gold, silver and bronze) and thin, large points, the leader's in the
  ball's light; line icons instead of emoji; square reflections of the ball and a spotlight
  instead of stars.
- A new typeface, Noto Sans Hebrew: thin and narrow for titles and scores, regular for
  text.
- How close each prediction was is shown in gold, pink, violet and ash instead of green,
  yellow, orange and red, in the breakdown and in the country-by-country table, which is
  now a mosaic of squares.
- The image of the table is drawn in the new look.
- A new name and brand: **Douze**, after the twelve points, with the slogan "מי באמת מבין
  באירוויזיון?". The name is written with a mirror ball for its O, in the bar and as the
  title of the home page, in both languages and on every screen size.
- The mirror ball is the icon of the tab and of the home screen, and heads the image of the
  table.
- A link to the site shows a card with the name and the slogan in chats.
- The site's address is now https://matan0810.github.io/douze. The old address
  (`/euro-rank`) no longer works, and with it the first site's paths `/players` and
  `/results`; what each device saved is kept.

### Removed

- Predictions and groups sent by link, and the "my prediction" page: without a server
  nothing synced, so sharing between phones will come back with one (issue #1).

### Fixed

- On small phones (360 pixels wide and less) the bar no longer cuts off the language switch:
  the name stays and leads home, and the separate home link steps aside.

## [1.1.0] - 2026-11-26

The second generation of the site, rebuilt on the method and tools of the project template,
in the look of the first.

### Added

- Predictions by link: each friend orders the countries on their own phone and sends a
  link; whoever runs the group adds it in one tap.
- A link to the whole group: everyone opens the same table on their own phone.
- Live mode on the night: drag the countries as the votes come in, and the table follows
  at once.
- The leaderboard as an image to share, in Hebrew or English.
- Statistics for every final: the surprise, the letdown, the wisdom of the crowd, the
  prophet, where we agreed and where we argued, every prediction country by country, and
  head to head between every two players.
- All the years: the winner of each final and the all-time table.
- A new final from a catalogue of 41 countries, for 2027 and on.
- English, with the whole page turning left to right; the language follows the browser
  and can be switched in the header.
- Every screen and every player's breakdown has its own address, to share and to reload.
- The last final's winner on the home page, and the version at the foot of every page.

### Changed

- The countries of a final are chosen from the catalogue, with their flags, instead of
  typed in with an emoji.
- Typing a country's name finds names that start with it first; the picker works with the
  keyboard, and its rows can be moved with the arrow keys as well as dragged.
- A tie on points goes to more exact places, then to more places within one.
- On phones the bar shows the emoji of each screen, and the results page shows the table
  first.
- Faster: less to download than before, the flags are small pictures, and the font is part
  of the site.
- Changes made on a device stay apart from the site's archive, and can be dropped to go
  back to it.

### Fixed

- The old addresses `/euro-rank/players` and `/euro-rank/results` open their screens
  instead of an error page.
- The bonus tile on the home page is gold, as intended.

### Security

- A Content Security Policy: the page runs and loads only its own files, with no inline
  script, and Trusted Types refuse any HTML written from a string.
- No outside host at all: the fonts and flags are no longer loaded from Google Fonts and
  flagcdn.com.
- Saved data and received links are checked strictly; a tampered value is ignored.
- No dependency runs code when it is installed, and CI leaves no token on disk.

## [1.0.0] - 2026-05-18

The first site: published after the 2026 final, with its result in it.

### Added

- Players and their predicted order of the final: a country typed by its name in Hebrew or
  English goes into the next place, and rows are reordered by dragging.
- The countries of the final, with their flags, added or removed by hand.
- The official result, and a leaderboard: 10 points per country less one per place off,
  and 15, 10 and 5 for the exact first three; each player's points country by country.
- The 2026 final: its 25 countries, the predictions of Adi, Ori and Matan, and the result.
- A Hebrew interface, right to left, on a night sky with stars.

Before this release the site was a prototype, built on 16 and 17 May 2026, first in
English and then in Hebrew. On 17 May GitHub Pages published the repository's source as it
was, unbuilt, which showed an empty page; the deploy that worked came on 18 May.
