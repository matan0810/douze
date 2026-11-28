import { isRole, type Role } from './capabilities';
import { isId, isSecret } from './ids';
import { record } from './json';
import { parseName } from './groups';

/**
 * What the site and the Worker say about who someone is (SERVER.md, "Identity"): a Google
 * account signs in, the site collects a session, and asks which groups the account is in.
 */

/** The code a finished sign-in leaves in the address, to be exchanged once for a session. */
export function parseCodeBody(value: unknown): { code: string } | undefined {
  const code = record(value, ['code'])?.code;
  return isSecret(code) ? { code } : undefined;
}

export interface Session {
  /** The session token: kept on this device, sent as `Authorization: Bearer`. */
  token: string;
  /** The name Google gives the account, for the greeting. */
  name: string;
}

export function parseSession(value: unknown): Session | undefined {
  const json = record(value, ['token', 'name']);
  const name = parseName(json?.name);
  return json && isSecret(json.token) && name ? { token: json.token, name } : undefined;
}

export interface MyGroup {
  id: string;
  name: string;
  /** Who the account is in that group, and as what. */
  me: { id: string; name: string; role: Role };
}

export interface Me {
  name: string;
  groups: MyGroup[];
}

/** As many groups as one account may belong to. */
const MAX_GROUPS = 50;

export function parseMe(value: unknown): Me | undefined {
  const json = record(value, ['name', 'groups']);
  const name = parseName(json?.name);
  if (!json || !name || !Array.isArray(json.groups) || json.groups.length > MAX_GROUPS)
    return undefined;
  const groups = json.groups.map((raw): MyGroup | undefined => {
    const g = record(raw, ['id', 'name', 'me']);
    const groupName = parseName(g?.name);
    const me = record(g?.me, ['id', 'name', 'role']);
    const myName = parseName(me?.name);
    return g && isId(g.id) && groupName && me && isId(me.id) && myName && isRole(me.role)
      ? { id: g.id, name: groupName, me: { id: me.id, name: myName, role: me.role } }
      : undefined;
  });
  return groups.every((g): g is MyGroup => !!g) ? { name, groups } : undefined;
}
