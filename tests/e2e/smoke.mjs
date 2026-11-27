// Browser smoke test: drives the built site in a real Chromium, on a desktop and on an
// emulated phone, in Hebrew and English.
//
//   npm run build && npm run e2e
//
// It checks the build in dist/, then builds its own copy with the server's address
// (.env.e2e, into dist-e2e/) and runs the real Worker in Node on SQLite (api.mjs) for the
// groups. It fails on any page error, console error or Content Security Policy violation,
// on any request that leaves this machine, and on sideways scroll. It walks every screen
// and flow; extend it with a step for every new one.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, devices } from 'playwright';
import { build, preview } from 'vite';
import { startApi } from './api.mjs';

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url)));
const { version } = await read('../../package.json');

async function main() {
  // The site as built for the browser test: the same production build, with the local
  // server's address (.env.e2e), into its own folder.
  await build({ mode: 'e2e', logLevel: 'warn', build: { outDir: 'dist-e2e' } });
  const api = await startApi();
  const server = await preview({
    build: { outDir: 'dist-e2e' },
    preview: { port: 0 },
    logLevel: 'silent',
  });
  const url = server.resolvedUrls.local[0];
  api.allow(new URL(url).origin);
  const browser = await chromium.launch();
  const problems = [];
  const step = (name) => console.log(`ok  ${name}`);

  // `refusals`: the browser logs a server's 4xx as a console error; a step that expects one
  // (an old invitation) says so, and only those are let through.
  const open = async (options, tag, { refusals = false } = {}) => {
    const context = await browser.newContext(options);
    // A broken step fails in seconds, not after Playwright's half-minute wait.
    context.setDefaultTimeout(15_000);
    // Requests are watched, not intercepted: interception would answer the browser's CORS
    // preflight itself and hide a server that refuses it. The policy blocks other hosts.
    context.on('request', (request) => {
      if (new URL(request.url()).hostname !== 'localhost')
        problems.push(`${tag}: request to another host ${request.url()}`);
    });
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
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (refusals && /status of 4\d\d/.test(m.text())) return;
      problems.push(`${tag}: console ${m.text()}`);
    });
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
  assert.equal(await page.title(), 'Douze');
  const card = await page.locator('meta[property="og:image"]').getAttribute('content');
  assert.match(card ?? '', /^https:\/\/.+\/brand\/card\.jpg$/, 'the page names its card');
  for (const file of [
    'favicon.svg',
    'apple-touch-icon.png',
    'manifest.webmanifest',
    'brand/card.jpg',
    'brand/icon-maskable-512.png',
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

  await page.getByRole('link', { name: /טקס חשיפה/ }).click();
  await atHash(page, '#/2026/reveal');
  await page.getByRole('button', { name: 'חשיפת מקום 3' }).click();
  await page.getByRole('listitem').filter({ hasText: 'אורי' }).getByText('139').waitFor();
  await page.getByRole('button', { name: 'חשיפת מקום 2' }).click();
  await page.getByRole('button', { name: 'ובמקום הראשון...' }).click();
  await page.getByText('Douze points!').waitFor();
  await page.getByRole('listitem').filter({ hasText: 'מתן' }).getByText('158').waitFor();
  step('reveal: the table told from the last place to the first, tap by tap');

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

  // The earlier years are in the archive and have addresses of their own.
  await page.goto(`${base}/2024/semi-1`);
  await atHash(page, '#/2024/semi-1');
  await page.getByRole('listitem').filter({ hasText: 'מתן' }).getByText('19').first().waitFor();
  await page.goto(`${base}/2025/semi-1`);
  await atHash(page, '#/2025/semi-1');
  assert.equal(
    (await page
      .getByRole('listitem')
      .filter({ hasText: /אורי|מתן/ })
      .count()) >= 2,
    true,
  );
  await page.goto(`${base}/2024/players`);
  await atHash(page, '#/2024/players');
  await page.getByRole('listitem').filter({ hasText: 'עדי' }).getByText('הושלם').waitFor();
  step('earlier years: 2024 and 2025 open at their own addresses, with their semi tables');

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
  await page.getByRole('heading', { name: /מה החיזוי אומר עליכם/ }).waitFor();
  await page.getByText('9 מתוך 10').waitFor();
  await page.getByRole('heading', { name: /הלב הישראלי/ }).waitFor();
  await page.getByRole('heading', { name: /המארחת והחמש הגדולות/ }).waitFor();
  await page.getByText('מארחת', { exact: true }).waitFor();
  step('stats: what we learned, each of us, the group, country by country, head to head');

  await page.goto(`${base}/history`);
  await page.getByRole('link', { name: /2026/ }).first().waitFor();
  await page.getByRole('heading', { name: /טבלת כל הזמנים/ }).waitFor();
  await page.getByRole('heading', { name: /יריבויות/ }).waitFor();
  // Each number beside its own player: over three finals Ori finished above Matan twice, Matan
  // above Ori once, so the 2 belongs beside Ori and the 1 beside Matan.
  const fixture = page.getByRole('listitem').filter({ hasText: 'אורי' }).filter({ hasText: 'מתן' });
  // The distance from a number to the box of a player's name: nearest edge to its centre.
  const near = async (name, number) => {
    const [who, count] = await Promise.all([
      fixture.getByText(name).first().boundingBox(),
      fixture.getByText(number, { exact: true }).boundingBox(),
    ]);
    if (!who || !count) return Infinity;
    const centre = count.x + count.width / 2;
    return Math.max(who.x - centre, 0, centre - (who.x + who.width));
  };
  assert.ok(
    (await near('אורי', '2')) < (await near('מתן', '2')) &&
      (await near('מתן', '1')) < (await near('אורי', '1')),
    'the rivalry score puts each number beside its player',
  );
  step('history: winners by year, the all-time table and the rivalries');

  await page.goto(`${base}/new`);
  await page.getByLabel('שנה').fill('2027');
  for (const country of ['ישראל', 'איטליה', 'צרפת'])
    await page.getByRole('button', { name: country, exact: true }).click();
  await page.getByRole('button', { name: /יצירת הגמר/ }).click();
  await atHash(page, '#/2027/players');
  await page.getByText('מדינות בגמר (3)').waitFor();
  step('new final: 2027 with three countries');

  const inTen = new Date(Date.now() + 10 * 86_400_000);
  const pad = (n) => String(n).padStart(2, '0');
  await page.goto(`${base}/2027/settings`);
  await page
    .getByLabel(/תאריך הגמר/)
    .fill(`${inTen.getFullYear()}-${pad(inTen.getMonth() + 1)}-${pad(inTen.getDate())}`);
  await page.goto(`${base}/`);
  const countdown = page.getByRole('link', { name: /ימים לגמר 2027/ });
  await countdown.getByText('10', { exact: true }).waitFor();
  step('countdown: the date of the final, set in the settings, counted down on the home page');

  await page.goto(`${base}/2027/players`);
  await page.getByLabel('הוספת שחקן חדש').fill('נועה');
  await page.getByRole('button', { name: 'הוספה', exact: true }).click();
  await page.getByRole('link', { name: /מצב תכנון/ }).click();
  await atHash(page, '#/2027/plan');
  await page.getByRole('button', { name: /נועה/ }).click();
  await page.getByText('שיר 1 מתוך 3').waitFor();
  await page.getByRole('button', { name: /פספסתי/ }).click();
  await page.getByRole('button', { name: 'העשירייה', exact: true }).click();
  await page.getByRole('button', { name: 'העשירייה', exact: true }).click();
  await page.getByRole('button', { name: 'למקום 1 במגירה' }).click();
  await page.reload();
  await page.getByRole('button', { name: /נועה/ }).click();
  await page.getByText('שיר 3 מתוך 3').waitFor();
  await page.getByText('חוזרים לשיר שפספסת').waitFor();
  await page.getByRole('button', { name: 'התחתית', exact: true }).click();
  await page.getByRole('button', { name: /שמירה כחיזוי של נועה/ }).click();
  await atHash(page, '#/2027/players');
  await page.getByRole('listitem').filter({ hasText: 'נועה' }).getByText('הושלם').waitFor();
  step(
    'planning mode: drawers, a place inside one, a missed song back at the end, kept after a reload, saved',
  );

  // ---------- Groups, through the real Worker (tests/e2e/api.mjs) ----------
  page.on('dialog', (dialog) => dialog.accept(dialog.type() === 'prompt' ? 'החברים' : undefined));
  await page.goto(`${base}/groups`);
  await page.getByLabel('שם הקבוצה').fill('החברים');
  await page.getByLabel('השם שלך בקבוצה').fill('מתן');
  await page.getByRole('button', { name: 'פתיחה' }).click();
  await page.getByRole('heading', { level: 1, name: 'החברים' }).waitFor();
  const owner = page.getByRole('listitem').filter({ hasText: 'מתן' });
  await owner.getByText('בעלים').waitFor();
  const invite = (await page.locator('p[dir="ltr"]').innerText()).trim();
  assert.match(
    invite,
    /#\/join\/[\w-]{22}\/[\w-]{43}$/,
    'the invitation carries its secret after #',
  );
  step('groups: a group is opened, with its owner and an invitation link');

  const { context: phoneA, page: adi } = await open(
    { ...devices['iPhone 13'], locale: 'he-IL' },
    'adi',
  );
  adi.on('dialog', (dialog) => dialog.accept());
  await adi.goto(invite);
  await adi.getByText('הוזמנתם ל"החברים"').waitFor();
  await adi.getByLabel('השם שלכם').fill('עדי');
  await adi.getByRole('button', { name: 'הצטרפות' }).click();
  await adi.getByRole('heading', { level: 1, name: 'החברים' }).waitFor();
  assert.match(
    await adi.evaluate(() => location.hash),
    /^#\/group\/[\w-]{22}$/,
    'the secret left the address',
  );
  await adi.getByRole('listitem').filter({ hasText: 'עדי' }).getByText('שחקן').waitFor();
  await noOverflow(adi, 'group page on a phone');
  step('groups: a friend joins from the link on a phone, and the secret leaves the address');

  const { context: phoneB, page: adi2 } = await open(
    { ...devices['iPhone 13'], locale: 'he-IL' },
    'adi2',
  );
  adi2.on('dialog', (dialog) => dialog.accept());
  await adi2.goto(invite);
  // The owner's name is a manager's: shown, never offered for a takeover.
  await adi2.getByTitle('מנהל: עובר רק מהטלפון שלו').waitFor();
  assert.equal(await adi2.getByRole('button', { name: 'זה אני, מתן' }).count(), 0);
  await adi2.getByRole('button', { name: 'זה אני, עדי' }).click();
  await adi2.getByRole('heading', { level: 1, name: 'החברים' }).waitFor();
  await adi2.getByText('בתור עדי').waitFor();
  await phoneB.close();
  step("groups: a player's name moves to a new phone; the owner's is protected");

  await page.reload();
  const adiRow = page.getByRole('listitem').filter({ hasText: 'עדי' });
  await adiRow.getByRole('button', { name: 'מינוי למנהל' }).click();
  await adiRow.getByText('מנהל', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'הצגת היומן' }).click();
  await page.getByText('עבר לטלפון חדש').waitFor();
  step('groups: the owner names an admin, and the log shows the takeover');

  await page.getByRole('button', { name: 'קישור חדש' }).click();
  await page.waitForFunction(
    (old) => {
      const shown = document.querySelector('p[dir="ltr"]')?.textContent?.trim();
      return !!shown && shown !== old;
    },
    invite,
    { timeout: 5000 },
  );
  const { context: phoneC, page: late } = await open(
    { ...devices['iPhone 13'], locale: 'he-IL' },
    'late',
    { refusals: true },
  );
  await late.goto(invite);
  await late.getByText('הקישור לא תקף').waitFor();
  await phoneC.close();
  step('groups: a renewed link replaces the old one, which stops working');

  await adi.getByRole('button', { name: 'יציאה מהקבוצה' }).click();
  await adi.getByRole('heading', { level: 1, name: /הקבוצות/ }).waitFor();
  await adi.getByText('עוד אין קבוצות במכשיר הזה').waitFor();
  await phoneA.close();
  await page.getByRole('button', { name: 'מחיקת הקבוצה' }).click();
  await page.getByRole('heading', { level: 1, name: /הקבוצות/ }).waitFor();
  await page.getByText('עוד אין קבוצות במכשיר הזה').waitFor();
  step('groups: a player leaves; the owner deletes the group by typing its name');

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
    '/2026/reveal',
    '/2026/plan',
    '/groups',
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
  await api.close();
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
