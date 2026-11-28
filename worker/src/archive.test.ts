import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../shared/config';
import { parseImportYear } from '../../shared/importYear';
import { parseYearView, type YearView } from '../../shared/years';
import { archivedYears, archiveYearBody } from '../../src/domain/archiveImport';
import { groupGame } from '../../src/domain/groupYear';
import { standings } from '../../src/domain/scoring';
import { scoringEntries } from '../../src/domain/stats';
import { archive } from '../../src/domain/archive';
import { baselineGame } from '../../src/state/games';
import { call, create, joined, joinAs } from '../test/client';

async function importAll(token: string, group: string) {
  const views: YearView[] = [];
  for (const year of archivedYears()) {
    const sent = await call('POST', `/groups/${group}/import/${year}`, {
      token,
      body: archiveYearBody(year),
    });
    expect(sent.status, `year ${year}`).toBe(200);
    const view = parseYearView(await sent.json());
    if (!view) throw new Error('not a year');
    views.push(view);
  }
  return views;
}

describe("the archive in a group's year", () => {
  it('is well formed, and each year fits one request', () => {
    for (const year of archivedYears()) {
      const body = archiveYearBody(year);
      expect(parseImportYear(JSON.parse(JSON.stringify(body)))).toEqual(body);
      expect(JSON.stringify(body).length).toBeLessThan(LIMITS.bodyBytes);
    }
  });

  it('lands closed, with its results, and scores like the archive', async () => {
    const owner = await create('החברים', 'מתן');
    const views = await importAll(owner.token, owner.group.id);
    const read = await call('GET', `/groups/${owner.group.id}`, { token: owner.token });
    const members = (await read.json()).members;
    for (const view of views) {
      expect(view.stages.every((s) => s.locked)).toBe(true);
      const game = groupGame(view, members);
      const edition = baselineGame(view.year, archive);
      if (!edition.result) continue;
      expect(game.result).toEqual(edition.result);
      const points = (g: typeof game) =>
        standings(scoringEntries(g), g.result ?? [], g.finalists, g.options.joker)
          .map((s) => s.total)
          .sort((a, b) => a - b);
      expect(points(game)).toEqual(points(edition));
    }
  });

  it('makes members of the names nobody holds, whom their people claim by joining', async () => {
    const owner = await create('החברים', 'מתן');
    await importAll(owner.token, owner.group.id);
    const names = (
      await (await call('GET', `/groups/${owner.group.id}`, { token: owner.token })).json()
    ).members
      .map((m: { name: string }) => m.name)
      .sort();
    expect(names).toEqual(['אורי', 'מתן', 'עדי'].sort());
    const claimed = await joinAs(owner.group.id, owner.invite, 'אורי', true);
    expect(claimed.status).toBe(201);
    const ori = (await claimed.json()).token;
    const year = await call('GET', `/groups/${owner.group.id}/years/2026`, { token: ori });
    const view = parseYearView(await year.json());
    const mine = view?.stages[0]?.entries.find((e) => e.member === (view.stages[0]?.done[0] ?? ''));
    expect(view?.stages[0]?.entries.length).toBeGreaterThan(1);
    expect(mine).toBeDefined();
  });

  it('is the owner only, and importing again replaces rather than doubles', async () => {
    const owner = await create();
    const player = await joined(owner.group.id, owner.invite, 'דנה');
    const body = archiveYearBody(2026);
    const path = `/groups/${owner.group.id}/import/2026`;
    expect((await call('POST', path, { token: player.token, body })).status).toBe(403);
    expect((await call('POST', path)).status).toBe(401);
    await call('POST', path, { token: owner.token, body });
    const again = await call('POST', path, { token: owner.token, body });
    expect(again.status).toBe(200);
    const view = parseYearView(await again.json());
    expect(view?.stages[0]?.entries.length).toBe(
      new Set(view?.stages[0]?.entries.map((e) => e.member)).size,
    );
  });

  it('refuses a malformed year, a stage twice, and a group that would overflow', async () => {
    const owner = await create();
    const path = `/groups/${owner.group.id}/import/2026`;
    const good = archiveYearBody(2026);
    if (!good?.stages[0]) throw new Error('a stage');
    for (const bad of [
      { stages: [good.stages[0], good.stages[0]] },
      { stages: [{ ...good.stages[0], extra: 1 }] },
      { stages: [{ ...good.stages[0], countries: ['atlantis', 'albania'] }] },
      { stages: 'x' },
    ])
      expect((await call('POST', path, { token: owner.token, body: bad })).status).toBe(400);
    const crowd = {
      stages: [
        {
          ...good.stages[0],
          entries: Array.from({ length: LIMITS.membersPerGroup }, (_, i) => ({
            name: `שחקן ${i}`,
            entry: { order: [], joker: null },
          })),
        },
      ],
    };
    const full = await call('POST', path, { token: owner.token, body: crowd });
    expect(full.status).toBe(409);
  });
});
