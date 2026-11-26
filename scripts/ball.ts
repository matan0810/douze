/**
 * The Douze mark: a mirror ball, the stage's disco ball and a crystal ball for predicting
 * at once (DESIGN.md, section 2). Its facets are lit from the top left. Pure: it returns
 * SVG text, and `scripts/brand.ts` writes every brand file from it.
 */

export interface BallOptions {
  /** The string it hangs from, above the ball. */
  string?: boolean;
  /** A soft pink halo behind it. */
  glow?: boolean;
  /** Crop to the ball itself, for small icons. */
  tight?: boolean;
}

const PALETTE = [
  '#3b0f6b',
  '#5b21b6',
  '#7c3aed',
  '#a21caf',
  '#db2777',
  '#f472b6',
  '#fbcfe8',
  '#fde68a',
  '#ffffff',
];
const CX = 100;
const CY = 104;
const R = 74;
const ROWS = 13;

function glint(x: number, y: number, s: number, fill: string): string {
  const k = s * 0.14;
  return (
    `<path fill="${fill}" d="M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}` +
    `Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z"/>`
  );
}

const fixed = (n: number) => Number(n.toFixed(2));

/** Every facet of the ball, row by row: position, size and colour. */
export function facets() {
  const out: { x: number; y: number; width: number; height: number; fill: string }[] = [];
  for (let i = 0; i < ROWS; i++) {
    const top = -Math.PI / 2 + (i * Math.PI) / ROWS;
    const bottom = top + Math.PI / ROWS;
    const y0 = CY + R * Math.sin(top);
    const y1 = CY + R * Math.sin(bottom);
    const half = Math.cos((top + bottom) / 2) * R;
    const cols = Math.max(4, Math.round(16 * Math.cos((top + bottom) / 2)));
    for (let j = 0; j < cols; j++) {
      const left = -Math.PI / 2 + (j * Math.PI) / cols;
      const right = left + Math.PI / cols;
      const x0 = CX + half * Math.sin(left);
      const x1 = CX + half * Math.sin(right);
      const lx = Math.sin((left + right) / 2);
      const ly = Math.sin((top + bottom) / 2);
      const light = 0.22 + 0.78 * Math.max(0, 1 - Math.hypot(lx + 0.45, ly + 0.5) * 0.62);
      const shade = Math.floor(light * 8 + ((i * 7 + j * 3) % 5) * 0.3);
      out.push({
        x: fixed(Math.min(x0, x1)),
        y: fixed(y0),
        width: fixed(Math.abs(x1 - x0) - 0.9),
        height: fixed(y1 - y0 - 0.9),
        fill: PALETTE[Math.min(PALETTE.length - 1, shade)] ?? '#ffffff',
      });
    }
  }
  return out;
}

export function ballSvg({ string = true, glow = true, tight = false }: BallOptions = {}): string {
  const box = tight ? `${CX - R - 4} ${CY - R - 4} ${2 * R + 8} ${2 * R + 8}` : '0 0 200 200';
  const rects = facets()
    .map(
      (f) =>
        `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" rx=".8" fill="${f.fill}"/>`,
    )
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">`,
    '<defs>',
    `<clipPath id="ball"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>`,
    '<radialGradient id="shine" cx=".33" cy=".28" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1a0038" stop-opacity=".5"/></radialGradient>',
    '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ec4899" stop-opacity=".45"/><stop offset="1" stop-color="#ec4899" stop-opacity="0"/></radialGradient>',
    '</defs>',
    glow ? `<circle cx="${CX}" cy="${CY}" r="98" fill="url(#halo)"/>` : '',
    string
      ? `<line x1="${CX}" y1="0" x2="${CX}" y2="${CY - R}" stroke="#d8b4fe" stroke-width="2"/>`
      : '',
    `<g clip-path="url(#ball)"><rect width="200" height="200" fill="#1a0533"/>${rects}`,
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#shine)"/></g>`,
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f9a8d4" stroke-opacity=".5" stroke-width="1.5"/>`,
    glint(62, 70, 15, '#fff'),
    tight ? '' : glint(150, 52, 10, '#fde68a') + glint(158, 150, 7, '#f9a8d4'),
    '</svg>',
  ].join('');
}
