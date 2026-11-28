import { isRole } from '../../shared/capabilities';
import { LIMITS } from '../../shared/config';
import {
  parseCreateGroup,
  parseDeleteGroup,
  parseJoin,
  parseSetRole,
  type AuditAction,
  type GroupView,
} from '../../shared/groups';
import { isSecret, newId } from '../../shared/ids';
import { hashToken, newToken, tokenMatches } from '../../shared/tokens';
import { allow, caller, signedIn, type Caller } from './auth';
import type { Env } from './env';
import { HttpError, json, readJson } from './http';
import { address, hit, sweep } from './rate';
import { all, first, int, text, textOrNull, type Sql, type Statement } from './sql';

/**
 * The groups: making one, joining it, its members and roles, its log (SERVER.md, part 2).
 * Every person is a signed-in Google account (`auth.ts`); a member is what an account is in
 * a group, and a name nobody holds can be claimed by joining with the invitation.
 */
const DAY = 24 * 60 * 60;

export async function body<T>(
  request: Request,
  parse: (value: unknown) => T | undefined,
): Promise<T> {
  const parsed = parse(await readJson(request, LIMITS.bodyBytes));
  if (!parsed) throw new HttpError(400, 'Bad request', 'bad-request');
  return parsed;
}

export function log(
  sql: Sql,
  groupId: string,
  actor: string | null,
  action: AuditAction,
  subject: string | null,
): Statement[] {
  const now = Date.now();
  return [
    sql
      .prepare(
        'INSERT INTO audit (group_id, at, actor, action, subject) VALUES (?1, ?2, ?3, ?4, ?5)',
      )
      .bind(groupId, now, actor, action, subject),
    // The log keeps the latest entries for a while, then lets them go.
    sql
      .prepare(
        `DELETE FROM audit WHERE group_id = ?1 AND (at < ?2 OR id NOT IN
           (SELECT id FROM audit WHERE group_id = ?1 ORDER BY id DESC LIMIT ?3))`,
      )
      .bind(groupId, now - LIMITS.auditDays * DAY * 1000, LIMITS.auditEntries),
  ];
}

async function view(
  sql: Sql,
  groupId: string,
  groupName: string,
  meId: string,
): Promise<GroupView> {
  const rows = await all(
    sql
      .prepare('SELECT id, name, role FROM members WHERE group_id = ?1 ORDER BY joined_at, id')
      .bind(groupId),
  );
  const members = rows.map((row) => {
    const role = row.role;
    if (!isRole(role)) throw new HttpError(500, 'Bad stored data');
    return { id: text(row, 'id'), name: text(row, 'name'), role };
  });
  const me = members.find((m) => m.id === meId);
  if (!me) throw new HttpError(401, 'Not signed in', 'unauthorized');
  return { id: groupId, name: groupName, me, members };
}

export async function createGroup(request: Request, env: Env): Promise<Response> {
  const sql = env.DB;
  const who = await signedIn(request, sql);
  await hit(sql, 'create', address(request), LIMITS.groupsPerAddressPerDay, DAY);
  await hit(sql, 'write', who.tokenHash, LIMITS.writesPerMinute, 60);
  const wanted = await body(request, parseCreateGroup);
  const count = await first(sql.prepare('SELECT COUNT(*) AS n FROM groups'));
  if (count && int(count, 'n') >= LIMITS.groupsTotal)
    throw new HttpError(503, 'No room for new groups', 'service-full');
  const owned = await first(
    sql
      .prepare("SELECT COUNT(*) AS n FROM members WHERE account_id = ?1 AND role = 'owner'")
      .bind(who.account.id),
  );
  if (owned && int(owned, 'n') >= LIMITS.groupsPerAccount)
    throw new HttpError(409, 'Too many groups', 'group-full');
  const groupId = newId();
  const memberId = newId();
  const invite = newToken();
  const now = Date.now();
  await sql.batch([
    sql
      .prepare('INSERT INTO groups (id, name, invite_hash, created_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(groupId, wanted.group, await hashToken(invite), now),
    sql
      .prepare(
        "INSERT INTO members (id, group_id, name, role, joined_at, account_id) VALUES (?1, ?2, ?3, 'owner', ?4, ?5)",
      )
      .bind(memberId, groupId, wanted.me, now, who.account.id),
    ...log(sql, groupId, wanted.me, 'group.create', wanted.group),
  ]);
  await sweep(sql, now);
  return json({ group: await view(sql, groupId, wanted.group, memberId), invite }, 201);
}

export async function readGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const who = await caller(request, env.DB, groupId);
  allow(who, 'group.read');
  return json(await view(env.DB, groupId, who.group.name, who.member.id));
}

/** Every group the signed-in account is in, and who it is in each. */
export async function myGroups(request: Request, env: Env): Promise<Response> {
  const who = await signedIn(request, env.DB);
  const rows = await all(
    env.DB.prepare(
      `SELECT g.id AS group_id, g.name AS group_name, m.id AS member_id, m.name AS member_name, m.role
       FROM members m JOIN groups g ON g.id = m.group_id
       WHERE m.account_id = ?1 ORDER BY m.joined_at, g.id`,
    ).bind(who.account.id),
  );
  return json({
    name: who.account.name,
    groups: rows.map((row) => {
      const role = row.role;
      if (!isRole(role)) throw new HttpError(500, 'Bad stored data');
      return {
        id: text(row, 'group_id'),
        name: text(row, 'group_name'),
        me: { id: text(row, 'member_id'), name: text(row, 'member_name'), role },
      };
    }),
  });
}

/** The group behind an invite: 403 for a wrong secret, counted against the address. */
async function invited(request: Request, sql: Sql, groupId: string) {
  const secret = request.headers.get('X-Invite') ?? '';
  const row = await first(
    sql.prepare('SELECT name, invite_hash FROM groups WHERE id = ?1').bind(groupId),
  );
  if (!row || !isSecret(secret) || !(await tokenMatches(secret, text(row, 'invite_hash')))) {
    await hit(sql, 'join', address(request), LIMITS.joinsPerHour, 60 * 60);
    throw new HttpError(403, 'This invitation is not valid', 'invite-wrong');
  }
  return { id: groupId, name: text(row, 'name') };
}

export async function preview(request: Request, env: Env, groupId: string): Promise<Response> {
  const group = await invited(request, env.DB, groupId);
  const rows = await all(
    env.DB.prepare(
      `SELECT name, role, (account_id IS NOT NULL) AS held
       FROM members WHERE group_id = ?1 ORDER BY joined_at, id`,
    ).bind(groupId),
  );
  return json({
    name: group.name,
    members: rows.map((row) => ({
      name: text(row, 'name'),
      role: text(row, 'role'),
      held: int(row, 'held') === 1,
    })),
  });
}

export async function join(request: Request, env: Env, groupId: string): Promise<Response> {
  const sql = env.DB;
  const who = await signedIn(request, sql);
  const group = await invited(request, sql, groupId);
  await hit(sql, 'join', address(request), LIMITS.joinsPerHour, 60 * 60);
  const wanted = await body(request, parseJoin);
  // Already in: joining again is just reading the group.
  const mine = await first(
    sql
      .prepare('SELECT id FROM members WHERE group_id = ?1 AND account_id = ?2')
      .bind(groupId, who.account.id),
  );
  if (mine) return json({ group: await view(sql, groupId, group.name, text(mine, 'id')) });
  const held = await first(
    sql
      .prepare('SELECT id, name, account_id FROM members WHERE group_id = ?1 AND name = ?2')
      .bind(groupId, wanted.name),
  );
  if (!held) {
    const count = await first(
      sql.prepare('SELECT COUNT(*) AS n FROM members WHERE group_id = ?1').bind(groupId),
    );
    if (count && int(count, 'n') >= LIMITS.membersPerGroup)
      throw new HttpError(409, 'The group is full', 'group-full');
    const memberId = newId();
    await sql.batch([
      sql
        .prepare(
          "INSERT INTO members (id, group_id, name, role, joined_at, account_id) VALUES (?1, ?2, ?3, 'member', ?4, ?5)",
        )
        .bind(memberId, groupId, wanted.name, Date.now(), who.account.id),
      ...log(sql, groupId, wanted.name, 'member.join', null),
    ]);
    return json({ group: await view(sql, groupId, group.name, memberId) }, 201);
  }
  // A name already in the group is its person's to claim, once, if nobody holds it yet.
  if (textOrNull(held, 'account_id') !== null || !wanted.claim)
    throw new HttpError(409, 'This name is taken', 'name-taken');
  const memberId = text(held, 'id');
  const name = text(held, 'name');
  await sql.batch([
    sql
      .prepare('UPDATE members SET account_id = ?1, claim_email = NULL WHERE id = ?2')
      .bind(who.account.id, memberId),
    ...log(sql, groupId, name, 'member.claim', name),
  ]);
  return json({ group: await view(sql, groupId, group.name, memberId) }, 201);
}

/** A write by a signed-in member: its caller, counted against the write limit. */
export async function writer(request: Request, sql: Sql, groupId: string): Promise<Caller> {
  const who = await caller(request, sql, groupId);
  await hit(sql, 'write', who.tokenHash, LIMITS.writesPerMinute, 60);
  return who;
}

export async function rotateInvite(request: Request, env: Env, groupId: string): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'invite.rotate');
  const invite = newToken();
  await sql.batch([
    sql
      .prepare('UPDATE groups SET invite_hash = ?1 WHERE id = ?2')
      .bind(await hashToken(invite), groupId),
    ...log(sql, groupId, who.member.name, 'invite.rotate', null),
  ]);
  return json({ invite });
}

async function target(sql: Sql, groupId: string, memberId: string) {
  const row = await first(
    sql
      .prepare('SELECT id, name, role FROM members WHERE id = ?1 AND group_id = ?2')
      .bind(memberId, groupId),
  );
  if (!row) throw new HttpError(404, 'No such member', 'not-found');
  const role = row.role;
  if (!isRole(role)) throw new HttpError(500, 'Bad stored data');
  return { id: text(row, 'id'), name: text(row, 'name'), role };
}

export async function setRole(
  request: Request,
  env: Env,
  groupId: string,
  memberId: string,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'admin.manage');
  const wanted = await body(request, parseSetRole);
  const member = await target(sql, groupId, memberId);
  if (member.role === 'owner') throw new HttpError(403, 'The owner stays the owner', 'owner-stays');
  await sql.batch([
    sql.prepare('UPDATE members SET role = ?1 WHERE id = ?2').bind(wanted.role, member.id),
    ...log(sql, groupId, who.member.name, 'role.change', `${member.name}:${wanted.role}`),
  ]);
  return json(await view(sql, groupId, who.group.name, who.member.id));
}

/** Frees a member's name from its account, so its person can claim it again (a wrong claim). */
export async function release(
  request: Request,
  env: Env,
  groupId: string,
  memberId: string,
): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'member.release');
  const member = await target(sql, groupId, memberId);
  // The owner is freed by nobody; an admin only by the owner.
  if (member.role === 'owner' || (member.role === 'admin' && who.member.role !== 'owner'))
    throw new HttpError(403, 'Not allowed', 'forbidden');
  await sql.batch([
    sql.prepare('UPDATE members SET account_id = NULL WHERE id = ?1').bind(member.id),
    // A released admin is a player again: the name is free to claim, and claiming it must not
    // bring the role back.
    sql
      .prepare("UPDATE members SET role = 'member' WHERE id = ?1 AND role = 'admin'")
      .bind(member.id),
    ...log(sql, groupId, who.member.name, 'member.release', member.name),
  ]);
  return json(await view(sql, groupId, who.group.name, who.member.id));
}

export async function leave(request: Request, env: Env, groupId: string): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  if (who.member.role === 'owner')
    throw new HttpError(409, 'The owner cannot leave; delete the group instead', 'owner-stays');
  await sql.batch([
    sql.prepare('DELETE FROM members WHERE id = ?1').bind(who.member.id),
    ...log(sql, groupId, who.member.name, 'member.leave', null),
  ]);
  return new Response(null, { status: 204 });
}

export async function deleteGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const sql = env.DB;
  const who = await writer(request, sql, groupId);
  allow(who, 'group.delete');
  const { confirm } = await body(request, parseDeleteGroup);
  if (confirm.toLocaleLowerCase() !== who.group.name.toLocaleLowerCase())
    throw new HttpError(400, "The name typed is not the group's", 'confirm-wrong');
  await sql.prepare('DELETE FROM groups WHERE id = ?1').bind(groupId).run();
  return new Response(null, { status: 204 });
}

export async function auditLog(request: Request, env: Env, groupId: string): Promise<Response> {
  const who = await caller(request, env.DB, groupId);
  allow(who, 'audit.read');
  const rows = await all(
    env.DB.prepare(
      'SELECT at, actor, action, subject FROM audit WHERE group_id = ?1 ORDER BY id DESC LIMIT 100',
    ).bind(groupId),
  );
  return json(
    rows.map((row) => ({
      at: int(row, 'at'),
      actor: textOrNull(row, 'actor'),
      action: text(row, 'action'),
      subject: textOrNull(row, 'subject'),
    })),
  );
}
