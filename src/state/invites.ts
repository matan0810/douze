import { isId, isSecret } from '../../shared/ids';
import { isRecord } from '../domain/parse';

/**
 * The invitation links this device made (SECURITY.md): for each group, the secret of the link
 * its owner made, so the page can show it again. The server keeps only the hash, so another
 * device has no link to show, only the way to make a new one.
 */
export const INVITES_KEY = 'eurorank:invites';
const MAX = 50;

export function parseInvites(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => isId(entry[0]) && isSecret(entry[1]))
      .slice(0, MAX),
  );
}

function load(): Record<string, string> {
  try {
    return parseInvites(JSON.parse(localStorage.getItem(INVITES_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

export function inviteOf(group: string): string | undefined {
  return load()[group];
}

export function rememberInvite(group: string, invite: string) {
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify({ ...load(), [group]: invite }));
  } catch {
    // Best effort: without storage the link is shown once, when it is made.
  }
}

export function forgetInvite(group: string) {
  const rest = Object.fromEntries(Object.entries(load()).filter(([id]) => id !== group));
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify(rest));
  } catch {
    // Nothing to forget if storage is unavailable.
  }
}
