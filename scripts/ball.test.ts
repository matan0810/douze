import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ballSvg, facets } from './ball';

describe('the mirror ball', () => {
  it('has facets inside the ball, in the palette, never empty', () => {
    const all = facets();
    expect(all.length).toBeGreaterThan(100);
    for (const f of all) {
      expect(f.width).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThan(0);
      expect(f.fill).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('is lit from the top left: brighter there than at the bottom right', () => {
    const brightness = (hex: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    const all = facets();
    const average = (list: typeof all) =>
      list.reduce((sum, f) => sum + brightness(f.fill), 0) / list.length;
    const topLeft = all.filter((f) => f.x < 90 && f.y < 90);
    const bottomRight = all.filter((f) => f.x > 110 && f.y > 120);
    expect(average(topLeft)).toBeGreaterThan(average(bottomRight));
  });

  it('crops to the ball for small icons, without string or halo', () => {
    const svg = ballSvg({ string: false, glow: false, tight: true });
    expect(svg).toContain('viewBox="22 26 156 156"');
    expect(svg).not.toContain('<line');
    expect(svg).not.toContain('url(#halo)');
  });

  it('is what the site serves: the brand files are up to date', () => {
    const read = (path: string) =>
      readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
    expect(read('brand/ball.svg')).toBe(ballSvg());
    expect(read('favicon.svg')).toBe(ballSvg({ string: false, glow: false, tight: true }));
  });
});
