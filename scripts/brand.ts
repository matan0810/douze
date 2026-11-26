/**
 * Writes every brand file from the mark in scripts/ball.ts: the ball and the favicon (SVG),
 * the home-screen icons and the card a chat shows for the site's address (PNG, drawn in
 * Chromium with the site's own fonts). Drawn once and committed; run again after a change:
 *
 *   node scripts/brand.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ballSvg } from './ball.ts';

const root = new URL('../', import.meta.url);
const file = (path: string) => new URL(path, root);
const ball = ballSvg();
const favicon = ballSvg({ string: false, glow: false, tight: true });
await writeFile(file('public/brand/ball.svg'), ball);
await writeFile(file('public/favicon.svg'), favicon);

const font = async (path: string) =>
  `data:font/woff2;base64,${(await readFile(file(`node_modules/${path}`))).toString('base64')}`;
const syne = await font('@fontsource/syne/files/syne-latin-800-normal.woff2');
const heebo = await font('@fontsource-variable/heebo/files/heebo-hebrew-wght-normal.woff2');
const svg = (text: string) => `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
const SKY = 'background:radial-gradient(ellipse at 25% 45%,#2d0a4e 0%,#0d0221 55%,#1a0038 100%)';
const page = (body: string) => `<!doctype html><meta charset="utf-8"><style>
  @font-face{font-family:Syne;src:url(${syne});font-weight:800}
  @font-face{font-family:Heebo;src:url(${heebo});font-weight:100 900}
  *{box-sizing:border-box}body{margin:0;overflow:hidden}
  .word{font-family:Syne;font-weight:800;line-height:1;letter-spacing:-.01em;
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .start{background-image:linear-gradient(100deg,#f9a8d4,#ec4899)}
  .end{background-image:linear-gradient(100deg,#a855f7,#fde68a 70%,#fff)}
  </style><body>${body}</body>`;

/** A few fixed stars, the same on every run. */
function stars(count: number, width: number, height: number) {
  let seed = 7;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: count }, () => {
    const size = 1 + next() * 2.4;
    return `<i style="position:absolute;left:${next() * width}px;top:${next() * height}px;width:${size}px;height:${size}px;border-radius:50%;background:#fff;opacity:${0.35 + next() * 0.6}"></i>`;
  }).join('');
}

const icon = (size: number) =>
  page(`<div style="position:relative;width:${size}px;height:${size}px;${SKY};overflow:hidden">
    ${stars(Math.round(size / 12), size, size)}
    <img src="${svg(favicon)}" style="position:absolute;inset:${size * 0.12}px;width:${size * 0.76}px;height:${size * 0.76}px"></div>`);

const card =
  page(`<div style="position:relative;width:1200px;height:630px;${SKY};overflow:hidden;font-family:Heebo">
  ${stars(80, 1200, 630)}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px">
    <div dir="ltr" style="display:flex;align-items:flex-end;filter:drop-shadow(0 6px 30px rgba(236,72,153,.45))">
      <span class="word start" style="font-size:190px">D</span>
      <img src="${svg(ball)}" style="width:182px;height:182px;margin:0 -6px -18px">
      <span class="word end" style="font-size:190px">uze</span></div>
    <div dir="rtl" style="color:#f5f3ff;font-size:58px;font-weight:700">מי באמת מבין באירוויזיון?</div>
  </div></div>`);

const browser = await chromium.launch();
const shots: [string, string, number, number][] = [
  ['public/apple-touch-icon.png', icon(180), 180, 180],
  ['public/brand/icon-192.png', icon(192), 192, 192],
  ['public/brand/icon-512.png', icon(512), 512, 512],
  ['public/brand/card.jpg', card, 1200, 630],
];
for (const [path, html, width, height] of shots) {
  const tab = await browser.newPage({ viewport: { width, height } });
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab
    .locator('img')
    .first()
    .evaluate((img: HTMLImageElement) => img.decode());
  // The card is a photo-like picture: a JPEG keeps it small enough for chat previews.
  const jpeg = path.endsWith('.jpg');
  await tab.screenshot({
    path: file(path).pathname,
    type: jpeg ? 'jpeg' : 'png',
    quality: jpeg ? 88 : undefined,
  });
  await tab.close();
}
await browser.close();
console.log('Brand files written.');
