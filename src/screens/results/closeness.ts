/** How close a predicted place was, in the four bands of the breakdown's colours. */
export type Closeness = 'exact' | 'near' | 'off' | 'far';

export function closeness(off: number): Closeness {
  if (off === 0) return 'exact';
  if (off <= 2) return 'near';
  if (off <= 5) return 'off';
  return 'far';
}
