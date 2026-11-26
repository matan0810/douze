/**
 * Draws the flag of every country in the catalogue as a small PNG in public/flags/, from
 * the SVGs of the flag-icons package (MIT). Drawn once and committed: an SVG flag with a
 * coat of arms weighs up to 180 KB, its picture at the size shown about 2.
 *
 *   node scripts/flags.ts
 */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const countries: { code: string }[] = JSON.parse(
  await readFile(new URL('src/data/countries.json', root), 'utf8'),
);
const browser = await chromium.launch();
// 4:3, three times the largest size the site shows (40 × 30).
const page = await browser.newPage({ viewport: { width: 120, height: 90 } });
for (const { code } of countries) {
  const svg = await readFile(
    new URL(`node_modules/flag-icons/flags/4x3/${code}.svg`, root),
    'utf8',
  );
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setContent(
    `<body style="margin:0"><img src="${src}" style="display:block;width:120px;height:90px">`,
  );
  await page.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: new URL(`public/flags/${code}.png`, root).pathname });
}
await browser.close();
console.log(`${countries.length} flags drawn.`);
