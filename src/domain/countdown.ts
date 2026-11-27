import type { Game } from './game';

/** Today on this device, as YYYY-MM-DD in its own time zone: the day people live in. */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whole days from `from` to `to`, both YYYY-MM-DD; negative when `to` has passed. */
export function daysBetween(from: string, to: string): number {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

export interface NextFinal {
  year: number;
  days: number;
}

/** The nearest final still ahead (or tonight), for the countdown on the home page. */
export function nextFinal(games: Iterable<Game>, on: string): NextFinal | undefined {
  let next: NextFinal | undefined;
  for (const game of games) {
    if (!game.date) continue;
    const days = daysBetween(on, game.date);
    if (days >= 0 && (!next || days < next.days)) next = { year: game.year, days };
  }
  return next;
}
