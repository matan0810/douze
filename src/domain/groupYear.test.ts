import { describe, expect, it } from 'vitest';
import type { YearView } from '../../shared/years';
import { archive } from './archive';
import { gameFromEdition } from './game';
import { autoClose, groupGame, knownResult, localMoment, stagesFromGame } from './groupYear';
import { standings } from './scoring';

const edition = archive.editions.find((e) => e.year === 2026);
if (!edition) throw new Error('2026 is in the archive');
const game2026 = gameFromEdition(edition, archive.players);

describe('the moment a stage locks', () => {
  it("is read on this device's own clock", () => {
    expect(localMoment('2026-05-16', '22:00')).toBe(new Date(2026, 4, 16, 22, 0).getTime());
  });

  it('refuses a date or a time that does not exist', () => {
    for (const [date, clock] of [
      ['2026-04-31', '22:00'],
      ['2026-05-16', '24:00'],
      ['2026-5-16', '22:00'],
      ['', ''],
    ])
      expect(localMoment(date ?? '', clock ?? '')).toBeUndefined();
  });
});

describe('the stages of a year, from this device', () => {
  const stages = stagesFromGame(game2026, '2026-05-16');

  it('are the final and each semi, with their countries', () => {
    expect(stages.map(([stage]) => stage)).toEqual(['final', 'semi-1', 'semi-2']);
    expect(stages[0]?.[1].countries).toEqual(game2026.finalists);
    expect(stages[1]?.[1].countries).toEqual(game2026.semis[0]?.countries);
  });

  it('stay open through each show, and close by themselves once the results are read', () => {
    expect(stages[0]?.[1].lockAt).toBe(new Date(2026, 4, 17, 0, 30).getTime());
    expect(stages[1]?.[1].lockAt).toBe(new Date(2026, 4, 12, 23, 50).getTime());
    expect(stages[2]?.[1].lockAt).toBe(new Date(2026, 4, 14, 23, 50).getTime());
  });

  it('are none without a date', () => {
    expect(stagesFromGame(game2026, '')).toEqual([]);
  });
});

describe('closing by itself', () => {
  it('crosses into the next month and year', () => {
    expect(autoClose('final', '2026-12-31')).toBe(new Date(2027, 0, 1, 0, 30).getTime());
    expect(autoClose('semi-1', '2026-06-02')).toBe(new Date(2026, 4, 29, 23, 50).getTime());
  });
});

describe("the group's year as a final", () => {
  const members = edition.predictions.map((p, i) => ({
    id: String(i).repeat(22),
    name: p.player,
    role: 'member' as const,
  }));
  const view: YearView = {
    year: 2026,
    now: 0,
    stages: [
      {
        stage: 'final',
        countries: game2026.finalists,
        lockAt: 1,
        joker: false,
        locked: true,
        done: members.map((m) => m.id),
        entries: edition.predictions.map((p, i) => ({
          member: members[i]?.id ?? '',
          entry: { order: p.order, joker: null },
        })),
        result: edition.result,
      },
    ],
  };

  it('scores like the archive with the same predictions and the result a manager entered', () => {
    const game = groupGame(view, members);
    const result = game.result ?? [];
    expect(result).toEqual(game2026.result);
    const points = (g: typeof game) =>
      standings(
        g.players.map((p) => ({ player: p.id, order: p.order })),
        result,
        g.finalists,
      )
        .map((s) => s.total)
        .sort();
    expect(points(game)).toEqual(points(game2026));
  });

  it('has no result until a manager enters one, whatever this phone knows', () => {
    const open = { ...view, stages: view.stages.map((st) => ({ ...st, result: null })) };
    expect(groupGame(open, members).result).toBeNull();
  });

  it("offers this phone's result to a manager only for the same countries", () => {
    const [final] = view.stages;
    if (!final) throw new Error('a final');
    expect(knownResult(final, game2026)).toEqual(game2026.result);
    const other = { ...game2026, finalists: game2026.finalists.slice(1) };
    expect(knownResult(final, other)).toBeNull();
    expect(knownResult(final, undefined)).toBeNull();
  });
});
