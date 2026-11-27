import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

const manifest: { icons: Icon[] } = JSON.parse(
  readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
);

// Android puts an icon that is not maskable on a white plate, and may pick a transparent
// one over the drawn ones: the ball then sits on white on the home screen.
describe('the home-screen icons', () => {
  it('include a maskable icon, the ball on its night sky, full bleed', () => {
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({ src: 'brand/icon-maskable-512.png', purpose: 'maskable' }),
    );
  });

  it('are all opaque pictures, never the transparent ball', () => {
    for (const icon of manifest.icons) expect(icon.type).toBe('image/png');
  });
});
