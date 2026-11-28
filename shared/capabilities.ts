/**
 * Who may do what in a group (SERVER.md, "Roles"): one table of role by action. The server
 * checks it before every action, the site reads it to hide buttons, and a test walks every
 * cell. Deny by default: an unknown role or action is refused.
 */
export const ROLES = ['owner', 'admin', 'member'] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  'group.read',
  'entry.write',
  'settings.write',
  'results.write',
  'live.drive',
  'member.release',
  'member.approve',
  'audit.read',
  'admin.manage',
  'invite.rotate',
  'group.handover',
  'group.export',
  'group.import',
  'group.delete',
] as const;
export type Action = (typeof ACTIONS)[number];

/** The lowest role that may do each action; a higher role may always do it too. */
export type Capabilities = Readonly<Record<Action, Role>>;

/** Owner above admin above member, as in SERVER.md. */
const RANK: Readonly<Record<Role, number>> = { member: 0, admin: 1, owner: 2 };

export const CAPABILITIES: Capabilities = {
  'group.read': 'member',
  'entry.write': 'member',
  'settings.write': 'admin',
  'results.write': 'admin',
  'live.drive': 'admin',
  'member.release': 'admin',
  'member.approve': 'admin',
  'audit.read': 'admin',
  'admin.manage': 'owner',
  'invite.rotate': 'owner',
  'group.handover': 'owner',
  'group.export': 'owner',
  'group.import': 'owner',
  'group.delete': 'owner',
};

export function isRole(value: unknown): value is Role {
  return ROLES.some((role) => role === value);
}

export function isAction(value: unknown): value is Action {
  return ACTIONS.some((action) => action === value);
}

/** Whether `role` may do `action`: false for no role, an unknown role or an unknown action. */
export function can(role: unknown, action: unknown, table: Capabilities = CAPABILITIES): boolean {
  if (!isRole(role) || !isAction(action)) return false;
  return RANK[role] >= RANK[table[action]];
}
