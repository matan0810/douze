/** Ids of groups and members: 128 random bits, as 22 URL-safe characters. */
const ID = /^[A-Za-z0-9_-]{22}$/;

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && ID.test(value);
}

/** A secret as it travels (an invite, a device token): 43 URL-safe characters. */
export function isSecret(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
