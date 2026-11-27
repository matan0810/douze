import { isId, isSecret } from '../../shared/ids';
import { parseName } from '../../shared/groups';

/**
 * The groups this device belongs to (SECURITY.md): for each, the device's token, the invite
 * it may pass on, and the names as last seen, so the list shows before the server answers.
 */
export const MEMBERSHIPS_KEY = 'eurorank:groups';
const MAX = 20;

export interface Membership {
  group: string;
  token: string;
  invite?: string;
  groupName: string;
  myName: string;
}

export function parseMemberships(value: unknown): Membership[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX).flatMap((raw): Membership[] => {
    if (typeof raw !== 'object' || raw === null) return [];
    const m: Record<string, unknown> = Object.fromEntries(Object.entries(raw));
    const groupName = parseName(m.groupName);
    const myName = parseName(m.myName);
    if (!isId(m.group) || !isSecret(m.token) || !groupName || !myName) return [];
    const invite = isSecret(m.invite) ? m.invite : undefined;
    return [{ group: m.group, token: m.token, groupName, myName, ...(invite ? { invite } : {}) }];
  });
}

export function loadMemberships(): Membership[] {
  try {
    return parseMemberships(JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function save(list: Membership[]) {
  try {
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Best effort: in a private window the membership lasts for the visit.
  }
}

/** Adds or replaces this device's membership of a group. */
export function remember(membership: Membership) {
  save([membership, ...loadMemberships().filter((m) => m.group !== membership.group)]);
}

export function forget(group: string) {
  save(loadMemberships().filter((m) => m.group !== group));
}

export function membership(group: string): Membership | undefined {
  return loadMemberships().find((m) => m.group === group);
}
