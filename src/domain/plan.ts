import { isRecord } from './parse';
import type { Game } from './game';

/**
 * Planning mode (DESIGN.md, section 4): a prediction built while watching. Each song, in
 * the running order, goes into a drawer, then into its place among the songs already there;
 * the drawers, top to bottom, are the prediction. It judges the place a song will get, not
 * how much one likes it.
 */
export const DRAWERS = ['win', 'top', 'middle', 'bottom'] as const;
export type Drawer = (typeof DRAWERS)[number];

export interface Plan {
  drawers: Record<Drawer, string[]>;
  /** The songs in the order they were placed, so the last one can be taken back. */
  placed: string[];
}

export function emptyPlan(): Plan {
  return { drawers: { win: [], top: [], middle: [], bottom: [] }, placed: [] };
}

/** The order songs come up in: the running order, then any finalist it lacks, in the field's. */
export function planOrder(game: Pick<Game, 'finalists' | 'runningOrder'>): string[] {
  const field = new Set(game.finalists);
  const running = game.runningOrder.filter((id) => field.has(id));
  return [...running, ...game.finalists.filter((id) => !running.includes(id))];
}

/** The next song to place, or undefined once every song is in a drawer. */
export function nextSong(plan: Plan, order: readonly string[]): string | undefined {
  const placed = new Set(plan.placed);
  return order.find((id) => !placed.has(id));
}

/** Puts a song into a drawer at `index` (clamped), out of wherever it was. */
export function place(plan: Plan, song: string, drawer: Drawer, index: number): Plan {
  const drawers = removed(plan, song);
  const list = [...drawers[drawer]];
  list.splice(Math.max(0, Math.min(index, list.length)), 0, song);
  return {
    drawers: { ...drawers, [drawer]: list },
    placed: [...plan.placed.filter((id) => id !== song), song],
  };
}

/** Takes back the song placed last. */
export function undo(plan: Plan): Plan {
  const last = plan.placed.at(-1);
  if (!last) return plan;
  return { drawers: removed(plan, last), placed: plan.placed.slice(0, -1) };
}

function removed(plan: Plan, song: string): Plan['drawers'] {
  return {
    win: plan.drawers.win.filter((id) => id !== song),
    top: plan.drawers.top.filter((id) => id !== song),
    middle: plan.drawers.middle.filter((id) => id !== song),
    bottom: plan.drawers.bottom.filter((id) => id !== song),
  };
}

/** The prediction the drawers make: each drawer in turn, top to bottom. */
export function planRanking(plan: Plan): string[] {
  return DRAWERS.flatMap((drawer) => plan.drawers[drawer]);
}

/**
 * A plan saved on this device, checked against the final's field: songs not in it, or in
 * two drawers, are dropped; anything malformed means an empty plan.
 */
export function parsePlan(value: unknown, field: readonly string[]): Plan | undefined {
  if (!isRecord(value) || !isRecord(value.drawers) || !Array.isArray(value.placed))
    return undefined;
  const seen = new Set<string>();
  const known = new Set(field);
  const take = (raw: unknown): string[] =>
    (Array.isArray(raw) ? raw : []).filter((id): id is string => {
      if (typeof id !== 'string' || !known.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const { drawers } = value;
  const plan = {
    win: take(drawers.win),
    top: take(drawers.top),
    middle: take(drawers.middle),
    bottom: take(drawers.bottom),
  };
  // Every song in a drawer is in the history once, in the order it was placed; one the
  // history lacks counts as placed first.
  const history = new Set(
    value.placed.filter((id): id is string => typeof id === 'string' && seen.has(id)),
  );
  return { drawers: plan, placed: [...[...seen].filter((id) => !history.has(id)), ...history] };
}
