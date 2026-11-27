import type { Member } from '../../shared/groups';
import {
  isFinalEntry,
  type Stage,
  type StageSetup,
  type StageView,
  type YearView,
} from '../../shared/years';
import { emptyGame, sameCountries, type Game } from './game';
import type { Semi } from './semis';

/**
 * A group's year on the site (DESIGN.md, section 4, "Groups"): the stages a manager sets
 * from the year on their device, and the group's predictions turned into a final the site
 * already knows how to score and show.
 */

/**
 * Predictions stay open through the show, while the songs are sung, and close when the
 * results start to be read (the owner's rule, 2026-11-27). A manager closes a stage by hand
 * at that moment; these are the times it closes by itself if no one does, on the device's
 * own clock, which is Israel's for the group: the final's voting ends near 00:30 the night
 * after its date, a semi's qualifiers are read near 23:50 on its evening. The semis are on
 * the Tuesday and the Thursday before the Saturday's final.
 */
const AUTO_CLOSE: Record<Stage, { daysFromFinal: number; clock: string }> = {
  final: { daysFromFinal: 1, clock: '00:30' },
  'semi-1': { daysFromFinal: -4, clock: '23:50' },
  'semi-2': { daysFromFinal: -2, clock: '23:50' },
};

/** A date (YYYY-MM-DD) and a clock (HH:MM) on this device's own time, as a moment. */
export function localMoment(date: string, clock: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(`${date}T${clock}`);
  if (!match) return undefined;
  const [year, month, day, hours, minutes] = match.slice(1).map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minutes === undefined
  )
    return undefined;
  const moment = new Date(year, month - 1, day, hours, minutes);
  // A date that does not exist (31 April) rolls over: refuse it rather than move it.
  return moment.getDate() === day && moment.getMonth() === month - 1 && hours < 24 && minutes < 60
    ? moment.getTime()
    : undefined;
}

/** When a stage closes by itself, for a final on `date` (YYYY-MM-DD). */
export function autoClose(stage: Stage, date: string): number | undefined {
  const { daysFromFinal, clock } = AUTO_CLOSE[stage];
  const final = localMoment(date, '12:00');
  if (final === undefined) return undefined;
  const day = new Date(final);
  day.setDate(day.getDate() + daysFromFinal);
  const pad = (n: number) => String(n).padStart(2, '0');
  return localMoment(
    `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
    clock,
  );
}

/**
 * The stages of a year as this device has it, for a final on `date`: the final and each
 * semi, each closing by itself after its show (`autoClose`). A stage with fewer than two
 * countries is left out.
 */
export function stagesFromGame(game: Game, date: string): [Stage, StageSetup][] {
  const all: [Stage, readonly string[], boolean][] = [
    ['final', game.finalists, game.options.joker],
    ...game.semis.map((semi, i): [Stage, readonly string[], boolean] => [
      i === 0 ? 'semi-1' : 'semi-2',
      semi.countries,
      false,
    ]),
  ];
  return all.flatMap(([stage, countries, joker]): [Stage, StageSetup][] => {
    const lockAt = autoClose(stage, date);
    return countries.length >= 2 && lockAt !== undefined
      ? [[stage, { countries: [...countries], lockAt, joker }]]
      : [];
  });
}

/**
 * The group's year as a final the site can score: the predictions it may see, and the
 * results a manager entered on the server. The group's results are its own: a phone's copy
 * of the year does not stand in for them.
 */
export function groupGame(view: YearView, members: readonly Member[]): Game {
  const game = emptyGame(view.year);
  const names = new Map(members.map((m) => [m.id, m.name]));
  const stage = (name: Stage) => view.stages.find((s) => s.stage === name);
  const final = stage('final');
  const semis = (['semi-1', 'semi-2'] as const).flatMap((name): Semi[] => {
    const semi = stage(name);
    if (!semi) return [];
    return [
      {
        countries: semi.countries,
        qualifiers: semi.result,
        predictions: semi.entries.flatMap(({ member, entry }) =>
          isFinalEntry(entry) ? [] : [{ player: member, ...entry }],
        ),
      },
    ];
  });
  const players = (final?.entries ?? []).flatMap(({ member, entry }) => {
    const name = names.get(member);
    if (!name || !isFinalEntry(entry)) return [];
    return [{ id: member, name: { he: name, en: name }, order: entry.order, ...jokerOf(entry) }];
  });
  return {
    ...game,
    finalists: final?.countries ?? [],
    result: final?.result ?? null,
    players,
    semis,
    options: { season: false, joker: final?.joker ?? false },
  };
}

/**
 * What a manager starts from when entering a stage's result: this phone's copy of it, when
 * the phone knows the same stage with the same countries (the archive, for a past year).
 */
export function knownResult(stage: StageView, base: Game | undefined): string[] | null {
  if (!base) return null;
  if (stage.stage === 'final')
    return base.result && sameCountries(base.finalists, stage.countries) ? base.result : null;
  const semi = base.semis[stage.stage === 'semi-1' ? 0 : 1];
  return semi?.qualifiers && sameCountries(semi.countries, stage.countries)
    ? semi.qualifiers
    : null;
}

function jokerOf(entry: { joker: string | null }) {
  return entry.joker ? { joker: entry.joker } : {};
}
