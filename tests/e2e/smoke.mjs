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
  await page.getByRole('link', { name: /גמר 2026 · מתן/ }).waitFor();
  step('home: Hebrew, right to left, the version, the CSP and the last winner');

  await page.getByRole('heading', { level: 1, name: 'Douze' }).waitFor();
  await page.getByRole('banner').getByRole('link', { name: /Douze/ }).waitFor();
  assert.equal(await page.title(), 'Douze · מי באמת מבין באירוויזיון?');
  const card = await page.locator('meta[property="og:image"]').getAttribute('content');
  assert.match(card ?? '', /^https:\/\/.+\/brand\/card\.jpg$/, 'the page names its card');
  for (const file of [
    'favicon.svg',
    'apple-touch-icon.png',
    'manifest.webmanifest',
    'brand/card.jpg',
    'brand/ball.svg',
  ]) {
    const response = await page.request.get(`${url}${file}`);
    assert.equal(response.status(), 200, `${file} is served`);
  }
  const ballDrawn = await page
    .getByRole('heading', { level: 1 })
    .locator('img')
    .evaluate((img) => img.complete && img.naturalWidth > 0);
  assert.ok(ballDrawn, 'the mirror ball of the wordmark loads');
  step('brand: the Douze wordmark in the bar and the title, the tab title, icons and card');

  await page.goto(`${base}/2026`);
  const board = page.getByRole('region', { name: /טבלת מובילים/ });
  await board.getByText('158', { exact: true }).waitFor();
  assert.equal(await board.getByRole('listitem').count(), 3);
  // Playwright counts a transparent element as visible: check that the rows really land.
  await page.waitForFunction(
    () => {
      const rows = [...document.querySelectorAll('ol > li.land')];
      return rows.length === 3 && rows.every((r) => getComputedStyle(r).opacity === '1');
    },
    null,
    { timeout: 5000 },
  );
  await board.getByText('158', { exact: true }).waitFor();
  await board.getByText('אלוף!').waitFor();
  await board.getByText('כמעט!').waitFor();
  await board.getByText('3 בול').waitFor();
  await board.getByRole('link', { name: /מתן/ }).click();
  await atHash(page, '#/2026/player/matan');
  const breakdown = page.getByRole('dialog', { name: 'מתן' });
  await breakdown.getByText('158 נק׳').waitFor();
  assert.equal(await breakdown.getByRole('row').count(), 26, 'a row per country and a header');
  await page.keyboard.press('Escape');
  await atHash(page, '#/2026');
  step('results: the 2026 table lands, with its stickers, and a breakdown with its own address');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /שיתוף הטבלה/ }).click();
  assert.equal((await download).suggestedFilename(), 'eurorank-2026.png');
  step('results: the table as an image');

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

  await page.goto(`${base}/2026/semi-1`);
  await page.getByRole('link', { name: 'חצי גמר 1', exact: true }).waitFor();
  await page.getByRole('listitem').filter({ hasText: 'אורי' }).getByText('18').waitFor();
  await page.getByRole('button', { name: 'הבחירה: מתן' }).click();
  const pick = page.getByRole('dialog', { name: /הבחירה של מתן/ });
  const perfect = ['פינלנד', 'ישראל', 'שוודיה', 'יוון', 'סרביה', 'ליטא', 'מולדובה', 'פולין'];
  for (const country of [...perfect, 'קרואטיה', 'בלגיה', 'אסטוניה'])
    await pick.getByRole('button', { name: country, exact: false }).first().click();
  await pick.getByText('10/10 עולות').waitFor();
  await pick.getByText('אסטוניה', { exact: true }).last().waitFor();
  await pick.getByRole('button', { name: /שמירת הבחירה/ }).click();
  await page.getByRole('listitem').filter({ hasText: 'מתן' }).getByText('20').first().waitFor();
  step('semis: a pick by tapping scores the semi');

  // 2026 has no season table: not everyone predicted every stage.
  assert.equal(await page.getByRole('link', { name: 'העונה', exact: true }).count(), 0);
  await page.goto(`${base}/2026/settings`);
  const seasonSwitch = page.getByRole('switch', { name: /טבלת עונה/ });
  assert.equal(await seasonSwitch.getAttribute('aria-checked'), 'false');
  await seasonSwitch.click();
  await page.getByRole('link', { name: 'העונה', exact: true }).click();
  await atHash(page, '#/2026/season');
  const matan = page.getByRole('table').getByRole('row', { name: /מתן/ });
  await matan.getByText('+5').waitFor();
  await matan.getByText('200', { exact: true }).waitFor();
  step('season: switched on in the settings, with the bonus of a perfect semi');

  await page.goto(`${base}/2026/settings`);
  await page.getByRole('switch', { name: /ג'וקר/ }).click();
  await page.goto(`${base}/2026/players`);
  await page
    .getByRole('listitem')
    .filter({ hasText: 'מתן' })
    .getByRole('button', { name: /עריכה/ })
    .click();
  const editing = page.getByRole('dialog', { name: /החיזוי של מתן/ });
  await editing.getByRole('button', { name: "ג'וקר: פינלנד" }).click();
  await editing.getByRole('button', { name: /שמירת חיזוי/ }).click();
  await page.goto(`${base}/2026/player/matan`);
  await page.getByRole('dialog', { name: 'מתן' }).getByText('×2').waitFor();
  step('joker: switched on in the settings, starred in the editor, counted twice');

  await page.goto(`${base}/2026/settings`);
  await page.getByRole('heading', { name: /המדינות בחצי גמר 2/ }).waitFor();
  await page.getByRole('button', { name: 'עריכה' }).nth(1).click();
  const chooser = page.getByRole('dialog', { name: 'המדינות בחצי גמר 1' });
  assert.ok(await chooser.getByRole('button', { name: /בולגריה/ }).isDisabled());
  await chooser.getByRole('button', { name: 'ביטול' }).click();
  step('settings: the final and each semi set apart; a country is in one semi only');

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

  await page.getByRole('button', { name: 'Switch to English' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  step('desktop: English, left to right, remembered after a reload');
  await desk.close();

  // ---------- Phone, every screen, both languages ----------
  const screens = [
    '/',
    '/2026',
    '/2026/players',
    '/2026/stats',
    '/2026/semi-1',
    '/2026/season',
    '/2026/settings',
    '/history',
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

  // The bar is fixed, so it never makes the page scroll: what does not fit in it is cut.
  for (const locale of ['he-IL', 'en-US'])
    for (const width of [320, 360]) {
      const { context, page: small } = await open(
        { viewport: { width, height: 700 }, isMobile: true, hasTouch: true, locale },
        `small ${locale} ${width}`,
      );
      await small.goto(`${base}/2026`);
      await small.getByRole('banner').getByRole('navigation').waitFor();
      const cut = await small.evaluate(() => {
        const bar = document.querySelector('header > div');
        return bar ? bar.scrollWidth - bar.clientWidth : -1;
      });
      assert.ok(cut === 0, `${locale} ${width}px: the bar is ${cut}px wider than the screen`);
      // Nothing in the bar may cover anything else: the name, each link, the language.
      const overlap = await small.evaluate(() => {
        const parts = [...document.querySelectorAll('header a, header button')].filter(
          (el) => el.getBoundingClientRect().width > 0,
        );
        const boxes = parts.map((el) => el.getBoundingClientRect());
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]];
            if (a && b && a.left < b.right - 1 && b.left < a.right - 1) return true;
          }
        return false;
      });
      assert.ok(!overlap, `${locale} ${width}px: parts of the bar cover each other`);
      await small.getByRole('button', { name: /English|עברית/ }).click({ trial: true });
      await context.close();
    }
  step('small phones (320 and 360 px): the bar fits, the language switch can be reached');

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
