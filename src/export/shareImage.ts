import type { Piece } from '../domain/pieces';
import type { Standing } from '../domain/scoring';
import type { Strings } from '../i18n/strings';

interface Input {
  title: string;
  table: Standing[];
  names: ReadonlyMap<string, string>;
  pieces: ReadonlyMap<string, Piece>;
  t: Strings;
}

const WIDTH = 1080;
const ROW = 120;
const TOP = 300;

/** The site's own tokens (src/styles/global.css), so the picture keeps the look. */
function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * The leaderboard as a picture for a chat, in the site's look and the page's language:
 * the velvet night with the ball's reflections, the wordmark, and every player on a row
 * outlined in their colour, with their place in Syne (the first three in their metals),
 * their token, and their points in their colour; the leader's row in the ball's light.
 */
export async function drawShareImage({
  title,
  table,
  names,
  pieces,
  t,
}: Input): Promise<Blob | null> {
  await document.fonts.ready;
  await document.fonts.load('800 60px Syne');
  const height = TOP + table.length * ROW + 140;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const c = canvas.getContext('2d');
  if (!c) return null;
  const rtl = t.dir === 'rtl';
  c.direction = rtl ? 'rtl' : 'ltr';
  const text = (weight: number, size: number) => `${weight} ${size}px Rubik, sans-serif`;
  const brandFont = (size: number) => `800 ${size}px Syne, sans-serif`;
  // x measured from the reading start
  const x = (fromStart: number) => (rtl ? WIDTH - fromStart : fromStart);
  const pink = token('--brand-pink', '#f9a8d4');
  const violet = token('--brand-violet', '#c084fc');
  const gold = token('--brand-gold', '#fde68a');
  const ink = token('--text', '#f3eefb');
  const brand = (from: number, to: number) => {
    const g = c.createLinearGradient(from, 0, to, 0);
    g.addColorStop(0, pink);
    g.addColorStop(0.5, violet);
    g.addColorStop(1, gold);
    return g;
  };

  // The night, a spotlight from above, and square reflections of the ball.
  c.fillStyle = token('--night', '#07030d');
  c.fillRect(0, 0, WIDTH, height);
  const spot = c.createRadialGradient(WIDTH / 2, -80, 0, WIDTH / 2, -80, 700);
  spot.addColorStop(0, 'rgb(236 72 153 / 22%)');
  spot.addColorStop(1, 'rgb(236 72 153 / 0%)');
  c.fillStyle = spot;
  c.fillRect(0, 0, WIDTH, height);
  const tones = [ink, pink, violet, gold];
  for (let i = 0; i < 60; i++) {
    const size = 3 + (i % 4);
    c.save();
    c.globalAlpha = 0.15 + ((i * 37) % 50) / 100;
    c.fillStyle = tones[i % tones.length] ?? ink;
    c.translate((i * 151) % WIDTH, (i * 97) % height);
    c.rotate(Math.PI / 4);
    c.fillRect(-size / 2, -size / 2, size, size);
    c.restore();
  }

  await drawWordmark(c, WIDTH / 2, 150, 104);
  c.textAlign = 'center';
  c.fillStyle = token('--muted', '#b9adc9');
  c.font = text(300, 38);
  c.fillText(title, WIDTH / 2, 228);

  const metals = [
    ['#fff4c7', '#f5c45a', '#b7791f'],
    ['#ffffff', '#c9ced6', '#8a93a0'],
    ['#ffd9b0', '#e08a4b', '#8a4a1c'],
  ];
  table.forEach((s, i) => {
    const y = TOP + i * ROW;
    const first = s.rank === 1;
    const colour = token(`--piece-${pieces.get(s.player) ?? 'violet'}`, '#a78bfa');
    // the row, outlined in the player's colour, the leader's in the ball's light
    c.lineWidth = first ? 3 : 2;
    c.strokeStyle = first ? brand(60, WIDTH - 60) : colour;
    c.globalAlpha = first ? 1 : 0.55;
    c.beginPath();
    c.roundRect(60, y + 8, WIDTH - 120, ROW - 20, 26);
    c.stroke();
    c.globalAlpha = 1;
    // the place
    c.textAlign = rtl ? 'right' : 'left';
    c.font = brandFont(48);
    const metal = metals[s.rank - 1];
    if (metal) {
      const g = c.createLinearGradient(0, y + 40, 0, y + 84);
      metal.forEach((stop, k) => g.addColorStop(k / 2, stop));
      c.fillStyle = g;
      c.fillText(String(s.rank).padStart(2, '0'), x(90), y + 84);
    } else {
      c.strokeStyle = 'rgb(243 238 251 / 45%)';
      c.lineWidth = 1.5;
      c.strokeText(String(s.rank).padStart(2, '0'), x(90), y + 84);
    }
    // the token
    const name = names.get(s.player) ?? s.player;
    c.fillStyle = colour;
    c.beginPath();
    c.arc(x(232), y + 68, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = token('--on-piece', '#1a0b2e');
    c.textAlign = 'center';
    c.font = text(800, 30);
    c.fillText(name.charAt(0), x(232), y + 79);
    // the name
    c.textAlign = rtl ? 'right' : 'left';
    c.fillStyle = ink;
    c.font = text(700, 42);
    c.fillText(name, x(286), y + 82);
    // the points, heavy, in the player's colour
    c.textAlign = rtl ? 'left' : 'right';
    c.font = text(800, 64);
    c.fillStyle = colour;
    c.fillText(String(s.total), x(WIDTH - 90), y + 90);
  });

  c.textAlign = 'center';
  c.font = text(400, 26);
  c.fillStyle = token('--faint', '#8f849f');
  c.fillText(t.ofMax(table[0]?.max ?? 0), WIDTH / 2, height - 60);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** The Douze wordmark, centred on `x` with its baseline on `y`: D, the ball, uze. */
async function drawWordmark(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  await document.fonts.load(`800 ${size}px Syne`);
  const ball = new Image();
  ball.src = `${import.meta.env.BASE_URL}brand/ball.svg`;
  await ball.decode().catch(() => undefined);
  c.save();
  c.direction = 'ltr';
  c.textAlign = 'left';
  c.font = `800 ${size}px Syne, sans-serif`;
  const ballSize = size * 0.96;
  const d = c.measureText('D').width;
  const rest = c.measureText('uze').width;
  const total = d + ballSize - size * 0.06 + rest;
  let left = x - total / 2;
  const paint = (text: string, from: string, to: string) => {
    const width = c.measureText(text).width;
    const gradient = c.createLinearGradient(left, 0, left + width, 0);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    c.fillStyle = gradient;
    c.fillText(text, left, y);
    left += width;
  };
  paint('D', '#f9a8d4', '#ec4899');
  left -= size * 0.03;
  if (ball.complete && ball.naturalWidth)
    c.drawImage(ball, left, y - ballSize + size * 0.1, ballSize, ballSize);
  left += ballSize - size * 0.03;
  paint('uze', '#a855f7', '#fde68a');
  c.restore();
}
