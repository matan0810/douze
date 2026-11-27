/** A name as typed: no control or direction marks, spaces collapsed, trimmed, capped. */
export function cleanName(raw: string, max: number): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  );
}
