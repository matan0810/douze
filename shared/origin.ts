/**
 * The origin of the server's address as a build is given it: https, or a local address for
 * development and the browser test. Anything else is no server.
 */
export function serverOrigin(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    const url = new URL(raw);
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    return url.protocol === 'https:' || local ? url.origin : undefined;
  } catch {
    return undefined;
  }
}
