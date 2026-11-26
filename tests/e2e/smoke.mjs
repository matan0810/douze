// Browser smoke test: drives the built site in a real Chromium, on a desktop and on an
// emulated phone, in Hebrew and English.
//
//   npm run build && npm run e2e
//
// It fails on any page error, console error or Content Security Policy violation, on any
// request that leaves the site's own address, and on sideways scroll. It walks every
// screen and flow; extend it with a step for every new one.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';
import { preview } from 'vite';

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url)));
const { version } = await read('../../package.json');
const edition = await read('../../src/data/editions/2026.json');
const countryIds = (await read('../../src/data/countries.json')).map((c) => c.id);
// One character per country, as src/domain/links.ts writes it.
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

async function main() {
  const server = await preview({ preview: { port: 0 }, logLevel: 'silent' });
  const url = server.resolvedUrls.local[0];
  const browser = await chromium.launch();
  const problems = [];
  const step = (name) => console.log(`ok  ${name}`);

  const open = async (options, tag) => {
    const context = await browser.newContext(options);
    // A broken step fails in seconds, not after Playwright's half-minute wait.
    context.setDefaultTimeout(15_000);
    await context.route(
      (target) => target.hostname !== 'localhost',
      (route) => {
        problems.push(`${tag}: request to another host ${route.request().url()}`);
        return route.abort();
      },
    );
    await context.exposeFunction('__cspViolation', (what) =>
      problems.push(`${tag}: blocked by the CSP: ${what}`),
    );
    await context.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__cspViolation(`${e.violatedDirective} ${e.blockedURI}`),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (error) => problems.push(`${tag}: ${error.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`${tag}: console ${m.text()}`));
    return { context, page };
  };
  const noOverflow = async (page, where) => {
    const extra = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(extra <= 0, `${where}: the page is ${extra}px wider than the screen`);
  };

  const base = `${url}#`;
  const atHash = async (page, hash) => {
    await page.waitForFunction((h) => window.location.hash === h, hash);
  };

  // ---------- Desktop, Hebrew ----------
  const { context: desk, page } = await open(
    { viewport: { width: 1280, height: 800 }, locale: 'he-IL', acceptDownloads: true },
    'desktop',
  );
  await page.goto(url);
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.getByText(`v${version}`, { exact: true }).waitFor();
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  assert.match(policy ?? '', /default-src 'none'/, 'the page carries its CSP');
  await page.getByRole('link', { name: /גמר 2026: מתן/ }).waitFor();
  step('home: Hebrew, right to left, the version, the CSP and the last winner');

  await page.goto(`${base}/2026`);
  const board = page.getByRole('region', { name: /טבלת מובילים/ });
  await board.getByText('158', { exact: true }).waitFor();
  assert.equal(await board.getByRole('listitem').count(), 3);
  await board.getByRole('link', { name: /מתן/ }).click();
  await atHash(page, '#/2026/player/matan');
  const breakdown = page.getByRole('dialog', { name: 'מתן' });
  await breakdown.getByText('158 נק׳').waitFor();
  assert.equal(await breakdown.getByRole('row').count(), 26, 'a row per country and a header');
  await page.keyboard.press('Escape');
  await atHash(page, '#/2026');
  step('results: the 2026 table, and a breakdown with its own address');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /תמונה לשיתוף/ }).click();
  assert.equal((await download).suggestedFilename(), 'eurorank-2026.png');
  step('results: the table as an image');

  // A perfect prediction, as a friend's phone would send it.
  const order = edition.result.map((id) => DIGITS[countryIds.indexOf(id)]).join('');
  await page.goto(`${base}/predict?y=2026&p=${order}-${encodeURIComponent('דנה')}`);
  await page.getByRole('button', { name: /הוספה לקבוצה שלי/ }).click();
  await atHash(page, '#/2026/players');
  await page.getByRole('listitem').filter({ hasText: 'דנה' }).getByText('✓ הושלם').waitFor();
  await page.goto(`${base}/2026`);
  await board.getByRole('link', { name: /דנה/ }).getByText('280', { exact: true }).waitFor();
  step('players: a prediction received by link joins the group and tops the table');

  await page.goto(`${base}/2026/players`);
  await page.getByLabel('הוספת שחקן חדש').fill('טל');
  await page.getByRole('button', { name: 'הוספה', exact: true }).click();
  await page
    .getByRole('listitem')
    .filter({ hasText: 'טל' })
    .getByRole('button', { name: /חיזוי/ })
    .click();
  const editor = page.getByRole('dialog', { name: /החיזוי של טל/ });
  const search = editor.getByRole('combobox');
  for (const typed of ['בולג', 'isr']) {
    await search.fill(typed);
    await search.press('Enter');
  }
  await editor.getByText('2 / 25 מדינות').waitFor();
  await editor.getByRole('button', { name: /שמירת חיזוי/ }).click();
  await page.getByRole('listitem').filter({ hasText: 'טל' }).getByText('2/25').waitFor();
  await page.reload();
  await page.getByRole('listitem').filter({ hasText: 'טל' }).getByText('2/25').waitFor();
  step('players: typing countries builds a prediction, kept after a reload');

  await page.goto(`${base}/2026/results`);
  await page.getByRole('button', { name: /מצב לייב/ }).click();
  await page
    .getByRole('region', { name: /טבלת מובילים/ })
    .getByText('לייב')
    .waitFor();
  await page.getByRole('button', { name: 'ביטול' }).click();
  step('results: live mode scores an order still being entered');

  await page.goto(`${base}/2026/stats`);
  await page.getByRole('heading', { name: 'חוכמת ההמון' }).waitFor();
  await page.getByRole('heading', { name: /מדינה אחר מדינה/ }).waitFor();
  await page.getByRole('heading', { name: /ראש בראש/ }).waitFor();
  step('stats: what we learned, country by country, head to head');

  await page.goto(`${base}/history`);
  await page.getByRole('link', { name: /2026/ }).first().waitFor();
  await page.getByRole('heading', { name: /טבלת כל הזמנים/ }).waitFor();
  step('history: winners by year and the all-time table');

  await page.goto(`${base}/new`);
  await page.getByLabel('שנה').fill('2027');
  for (const country of ['ישראל', 'איטליה', 'צרפת'])
    await page.getByRole('button', { name: country, exact: true }).click();
  await page.getByRole('button', { name: /יצירת הגמר/ }).click();
  await atHash(page, '#/2027/players');
  await page.getByText('מדינות בגמר (3)').waitFor();
  step('new final: 2027 with three countries');

  await page.goto(`${url}players`);
  await atHash(page, '#/2026/players');
  step('the first site’s address /players opens the players of 2026');

  await page.getByRole('button', { name: 'Switch to English' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  step('desktop: English, left to right, remembered after a reload');
  await desk.close();

  // ---------- A whole group, opened on another device ----------
  const { context: friend, page: other } = await open(
    { viewport: { width: 1280, height: 800 }, locale: 'en-US' },
    'friend',
  );
  const field = edition.finalists.map((id) => DIGITS[countryIds.indexOf(id)]).join('');
  await other.goto(
    `${base}/join?y=2026&f=${field}&r=${order}&p=${order}-${encodeURIComponent('Noa')}`,
  );
  await other.getByRole('button', { name: /Keep on this device/ }).click();
  await atHash(other, '#/2026');
  await other
    .getByRole('region', { name: /Leaderboard/ })
    .getByText('Noa')
    .waitFor();
  await other.goto(`${base}/predict?y=2026&p=zz`);
  await other.getByText(/This link is broken/).waitFor();
  step('group link: kept on another device; a broken link says so');
  await friend.close();

  // ---------- Phone, every screen, both languages ----------
  const screens = [
    '/',
    '/2026',
    '/2026/players',
    '/2026/stats',
    '/history',
    '/2026/predict',
    '/new',
    '/2026/player/matan',
  ];
  for (const locale of ['he-IL', 'en-US']) {
    const { context, page: phone } = await open(
      { ...devices['iPhone 13'], locale },
      `phone ${locale}`,
    );
    for (const screen of screens) {
      await phone.goto(`${base}${screen}`);
      await phone
        .getByRole('heading', { level: screen.includes('player/') ? 2 : 1 })
        .first()
        .waitFor();
      await noOverflow(phone, `${locale} ${screen}`);
    }
    step(`phone ${locale}: every screen fits the width`);
    await context.close();
  }

  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('all good');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
