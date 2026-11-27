/**
 * Secrets of the server (SERVER.md, "Sessions and tokens"): random 256-bit tokens, stored
 * only as SHA-256 hashes, compared in constant time. Web Crypto only, so the Worker, the
 * site and the tests all run the same code.
 */
const BYTES = 32;

function base64url(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A new random secret: 256 bits, as 43 URL-safe characters. */
export function newToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(BYTES)));
}

/** The form a secret is stored in: its SHA-256 hash, in lower-case hex. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two strings without stopping at the first difference. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++)
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

/** Whether a presented secret matches a stored hash. */
export async function tokenMatches(presented: string, storedHash: string): Promise<boolean> {
  return constantTimeEqual(await hashToken(presented), storedHash);
}
