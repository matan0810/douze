/**
 * The site's icons: thin lines with square ends, like the facets of the mirror ball
 * (DESIGN.md, section 2). They replace every emoji of the interface; flags stay the only
 * pictures in colour. Decorative: the text or label beside them carries the meaning.
 */
const PATHS = {
  home: 'M12 3l2 6.5 6.5 2.5-6.5 2.5L12 21l-2-6.5L3.5 12 10 9.5z',
  players: 'M5.5 4h7v7h-7zM3 20v-3.5h12V20M14.5 6h5v5h-5M17 14.5h4V20',
  results:
    'M7 4h10v5.5a5 5 0 0 1-10 0zM7 6H4v1.5a3 3 0 0 0 3 3M17 6h3v1.5a3 3 0 0 1-3 3M12 14.5V18M8 20h8',
  stats: 'M4 20h16M6 20v-7M11 20V5M16 20v-10',
  history: 'M4 5h16v15H4zM4 10h16M8.5 3v4M15.5 3v4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  image: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  live: 'M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13',
  crown: 'M4 18h16M4 18L3 7l5 4 4-6 4 6 5-4-1 11',
  close: 'M5 5l14 14M19 5L5 19',
  check: 'M4 12.5l5 5L20 6.5',
  plus: 'M12 4v16M4 12h16',
  warn: 'M12 3L2 20h20zM12 9v5M12 17v.01',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  rise: 'M4 18L10 12l4 4 6-8M14 8h6v6',
  fall: 'M4 6l6 6 4-4 6 8M14 18h6v-6',
  crowd: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  prophet: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  agree: 'M4 9h16M4 15h16',
  split: 'M12 21V12M12 12L5 4M12 12l7-8',
  grid: 'M3 3h5v5H3zM10 3h5v5h-5zM17 3h4v5h-4zM3 10h5v5H3zM10 10h5v5h-5zM17 10h4v5h-4zM3 17h5v4H3zM10 17h5v4h-5zM17 17h4v4h-4z',
  duel: 'M4 20L14 10M14 10l2-6 4 4-6 2M20 20L10 10M10 10L8 4 4 8l6 2',
  scoring: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  joker: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',
  settings: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
