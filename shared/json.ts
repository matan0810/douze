/** Checks for messages between the site and the Worker: no casts, unknown fields refused. */
export type Json = Record<string, unknown>;

export function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An object with only the given keys, or undefined (OWASP: mass assignment). */
export function record(value: unknown, keys: readonly string[]): Json | undefined {
  if (!isJson(value)) return undefined;
  return Object.keys(value).every((key) => keys.includes(key)) ? value : undefined;
}
