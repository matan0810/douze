import type { Standing } from '../domain/scoring';
import type { Strings } from '../i18n/strings';

interface Input {
  title: string;
  table: Standing[];
  names: ReadonlyMap<string, string>;
  t: Strings;
}

const WIDTH = 1080;
const ROW = 112;
const TOP = 300;
const MEDALS = ['👑', '🥈', '🥉'];
const BARS: [string, string][] = [
  ['#f59e0b', '#fcd34d'],
  ['#9ca3af', '#e5e7eb'],
  ['#b45309', '#d97706'],
];

/**
 * The leaderboard as a picture for a chat, in the site's look and the page's language:
 * the night sky, the Douze wordmark, and every player with medal, points and a bar.
 */
export async function drawShareImage({ title, table, names, t }: Input): Promise<Blob | null> {
  await document.fonts.ready;
  const height = TOP + table.length * ROW + 120;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const c = canvas.getContext('2d');
  if (!c) return null;
  const rtl = t.dir === 'rtl';
  c.direction = rtl ? 'rtl' : 'ltr';
  const font = (weight: number, size: number) => `${weight} ${size}px 'Heebo Variable', sans-serif`;
  // x measured from the reading start
  const x = (fromStart: number) => (rtl ? WIDTH - fromStart : fromStart);

  const sky = c.createRadialGradient(WIDTH * 0.2, height / 2, 0, WIDTH * 0.2, height / 2, WIDTH);
  sky.addColorStop(0, '#2d0a4e');
  sky.addColorStop(0.5, '#0d0221');
  sky.addColorStop(1, '#1a0038');
  c.fillStyle = sky;
  c.fillRect(0, 0, WIDTH, height);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgb(255 255 255 / ${0.3 + ((i * 37) % 60) / 100})`;
    c.beginPath();
    c.arc((i * 151) % WIDTH, (i * 97) % height, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    c.fill();
  }

  await drawWordmark(c, WIDTH / 2, 160, 104);
  c.textAlign = 'center';
  c.fillStyle = '#d8b4fe';
  c.font = font(600, 40);
  c.fillText(title, WIDTH / 2, 230);

  table.forEach((s, i) => {
    const y = TOP + i * ROW;
    const podium = s.rank <= 3;
    c.fillStyle = podium ? 'rgb(250 204 21 / 10%)' : 'rgb(255 255 255 / 5%)';
    c.strokeStyle = podium ? 'rgb(250 204 21 / 40%)' : 'rgb(255 255 255 / 12%)';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(60, y, WIDTH - 120, ROW - 20, 24);
    c.fill();
    c.stroke();
    c.textAlign = rtl ? 'right' : 'left';
    c.font = font(700, 44);
    c.fillStyle = '#c084fc';
    c.fillText(MEDALS[s.rank - 1] ?? `#${s.rank}`, x(90), y + 62);
    c.fillStyle = '#ffffff';
    c.fillText(names.get(s.player) ?? s.player, x(190), y + 62);
    c.textAlign = rtl ? 'left' : 'right';
    c.font = font(900, 48);
    c.fillStyle = s.rank === 1 ? '#facc15' : '#f8fafc';
    c.fillText(String(s.total), x(WIDTH - 100), y + 64);
    const [from, to] = BARS[s.rank - 1] ?? ['#7c3aed', '#ec4899'];
    const barStart = 560;
    const barLength = 300;
    const bar = c.createLinearGradient(x(barStart), 0, x(barStart + barLength), 0);
    bar.addColorStop(0, from);
    bar.addColorStop(1, to);
    c.fillStyle = 'rgb(255 255 255 / 10%)';
    c.fillRect(Math.min(x(barStart), x(barStart + barLength)), y + 40, barLength, 12);
    c.fillStyle = bar;
    const filled = barLength * s.share;
    c.fillRect(rtl ? x(barStart) - filled : x(barStart), y + 40, filled, 12);
  });

  c.textAlign = 'center';
  c.font = font(500, 28);
  c.fillStyle = 'rgb(216 180 254 / 60%)';
  c.fillText(t.ofMax(table[0]?.max ?? 0), WIDTH / 2, height - 50);

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
