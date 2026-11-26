# EuroRank: design

What the product does and why: the rules, the numbers and the behaviour. A change to any of
them is made here first (CLAUDE.md, section 4).

## 1. Scope

| In                                                   | Out                                  |
| ---------------------------------------------------- | ------------------------------------ |
| The grand final of each year, from 2026              | Semi-finals, jury and televote split |
| Predictions of the full order, the result, the table | Accounts, a server, live data feeds  |
| Hebrew (RTL) and English                             | Other languages                      |

## 2. Look

The design tokens are in `src/styles/global.css`.

## 3. Scoring

For every country in the final, a prediction earns **10 points less one for each place it
is off**, never below zero. Placing the **winner exactly earns 15 more, the runner-up 10,
and third 5**. A final of 25 countries is worth at most 25 × 10 + 30 = **280**.

- Only a **complete** prediction is scored: every finalist, each exactly once.
- The table is ordered by points; a tie goes to more exact places, then to more places
  within one. Players still level share the rank.
- The rule lives in `src/domain/scoring.ts`; its tests include the real 2026 final
  (Matan 158, Adi 145, Ori 139).

## 4. Addresses

Every screen has its own address. List them here.
