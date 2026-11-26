# Changelog

All changes a visitor or the owner would notice are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and versions follow
[Semantic Versioning](https://semver.org/).

Version 0.1.0 was never numbered at the time. It was reconstructed from the git history: the
state of `master` published to the live site on 2026-05-18 (a deploy on the old `gh-pages`
branch).

## [Unreleased]

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

## [0.1.0] - 2026-05-18

### Added

- Players and their predicted order of the Eurovision final, typed in by country name in
  Hebrew or English and reordered by dragging.
- The official result, and a leaderboard with every player's points country by country.
- The 2026 final: its 25 countries, three players' predictions and the result.
