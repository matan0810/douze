import { isRole, type Role } from './capabilities';
import { LIMITS } from './config';
import { isId, isSecret } from './ids';
import { record } from './json';
import { cleanName } from './names';

/**
 * What the site and the Worker say to each other about groups: one parser per message,
 * used on both ends. Anything that does not fit is refused (undefined), never cast; an
 * unknown field is refused too (OWASP: mass assignment).
 */

/** A name as a person typed it: cleaned, then within the project's limits. */
export function parseName(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > LIMITS.nameMax * 4) return undefined;
  const name = cleanName(value, LIMITS.nameMax);
  return name.length >= LIMITS.nameMin ? name : undefined;
}

export interface CreateGroup {
  group: string;
  me: string;
}

export function parseCreateGroup(value: unknown): CreateGroup | undefined {
  const json = record(value, ['group', 'me']);
  const group = parseName(json?.group);
  const me = parseName(json?.me);
  return group && me ? { group, me } : undefined;
}

export interface Join {
  name: string;
  /** The joiner says this name is theirs, though another device holds it. */
  takeover: boolean;
}

export function parseJoin(value: unknown): Join | undefined {
  const json = record(value, ['name', 'takeover']);
  const name = parseName(json?.name);
  const takeover = json?.takeover === undefined ? false : json.takeover;
  return name && typeof takeover === 'boolean' ? { name, takeover } : undefined;
}

export interface SetRole {
  role: 'admin' | 'member';
}

export function parseSetRole(value: unknown): SetRole | undefined {
  const role = record(value, ['role'])?.role;
  return role === 'admin' || role === 'member' ? { role } : undefined;
}

export interface DeleteGroup {
  /** The group's name, typed again: a deletion is never one tap. */
  confirm: string;
}

export function parseDeleteGroup(value: unknown): DeleteGroup | undefined {
  const confirm = parseName(record(value, ['confirm'])?.confirm);
  return confirm ? { confirm } : undefined;
}

export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface GroupView {
  id: string;
  name: string;
  me: Member;
  members: Member[];
}

function parseMember(value: unknown): Member | undefined {
  const json = record(value, ['id', 'name', 'role']);
  const name = parseName(json?.name);
  return json && isId(json.id) && name && isRole(json.role)
    ? { id: json.id, name, role: json.role }
    : undefined;
}

export function parseGroupView(value: unknown): GroupView | undefined {
  const json = record(value, ['id', 'name', 'me', 'members']);
  const name = parseName(json?.name);
  const me = parseMember(json?.me);
  if (!json || !isId(json.id) || !name || !me || !Array.isArray(json.members)) return undefined;
  if (json.members.length > LIMITS.membersPerGroup) return undefined;
  const members = json.members.map(parseMember);
  return members.every((m): m is Member => !!m) ? { id: json.id, name, me, members } : undefined;
}

export interface Joined {
  group: GroupView;
  token: string;
  /** The invite secret: returned when a group is made or its link renewed. */
  invite?: string;
}

export function parseJoined(value: unknown): Joined | undefined {
  const json = record(value, ['group', 'token', 'invite']);
  const group = parseGroupView(json?.group);
  if (!json || !group || !isSecret(json.token)) return undefined;
  if (json.invite !== undefined && !isSecret(json.invite)) return undefined;
  return { group, token: json.token, ...(isSecret(json.invite) ? { invite: json.invite } : {}) };
}

export interface Preview {
  name: string;
  /** `held`: a phone has the name (a manager's name is then not to be claimed). */
  members: { name: string; role: Role; held: boolean }[];
}

export function parsePreview(value: unknown): Preview | undefined {
  const json = record(value, ['name', 'members']);
  const name = parseName(json?.name);
  if (!json || !name || !Array.isArray(json.members)) return undefined;
  const members = json.members.flatMap((raw): Preview['members'] => {
    const m = record(raw, ['name', 'role', 'held']);
    const memberName = parseName(m?.name);
    return memberName && isRole(m?.role) && typeof m.held === 'boolean'
      ? [{ name: memberName, role: m.role, held: m.held }]
      : [];
  });
  return members.length === json.members.length ? { name, members } : undefined;
}

export interface AuditEntry {
  at: number;
  actor: string | null;
  action: AuditAction;
  subject: string | null;
}

export const AUDIT_ACTIONS = [
  'group.create',
  'member.join',
  'member.takeover',
  'member.leave',
  'member.release',
  'role.change',
  'invite.rotate',
  'stage.set',
  'stage.remove',
  'stage.close',
  'result.set',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isAuditAction(value: unknown): value is AuditAction {
  return AUDIT_ACTIONS.some((action) => action === value);
}

/** Why a request was refused, as a closed list the site turns into words. */
export const ERROR_CODES = [
  'bad-request',
  'not-found',
  'unauthorized',
  'forbidden',
  'invite-wrong',
  'name-protected',
  'name-taken',
  'group-full',
  'service-full',
  'rate-limited',
  'confirm-wrong',
  'owner-stays',
  'locked',
  'not-closed',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value);
}

export function parseAudit(value: unknown): AuditEntry[] | undefined {
  if (!Array.isArray(value) || value.length > 100) return undefined;
  const entries = value.map((raw): AuditEntry | undefined => {
    const json = record(raw, ['at', 'actor', 'action', 'subject']);
    if (!json || typeof json.at !== 'number' || !isAuditAction(json.action)) return undefined;
    const name = (v: unknown) => (v === null ? null : (parseName(v) ?? undefined));
    const actor = name(json.actor);
    const subject = typeof json.subject === 'string' ? json.subject.slice(0, 100) : null;
    return actor === undefined ? undefined : { at: json.at, actor, action: json.action, subject };
  });
  return entries.every((e): e is AuditEntry => !!e) ? entries : undefined;
}
