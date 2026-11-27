import { can, isRole, type Action, type Role } from '../../shared/capabilities';
import { isSecret } from '../../shared/ids';
import { hashToken } from '../../shared/tokens';
import { HttpError } from './http';
import { first, int, text, type Sql } from './sql';

/** Who is asking: a device that holds a member's name in a group. */
export interface Caller {
  tokenHash: string;
  group: { id: string; name: string };
  member: { id: string; name: string; role: Role };
}

/** How often a device's "last seen" is written: at most once an hour, to spare writes. */
const SEEN_EVERY = 60 * 60 * 1000;

/** The caller of a group's request, by the bearer token in `Authorization`; 401 if none fits. */
export async function caller(request: Request, sql: Sql, groupId: string): Promise<Caller> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!isSecret(token)) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const tokenHash = await hashToken(token);
  const row = await first(
    sql
      .prepare(
        `SELECT d.seen_at, m.id AS member_id, m.name AS member_name, m.role, g.id AS group_id, g.name AS group_name
         FROM devices d JOIN members m ON m.id = d.member_id JOIN groups g ON g.id = d.group_id
         WHERE d.token_hash = ?1 AND d.group_id = ?2`,
      )
      .bind(tokenHash, groupId),
  );
  if (!row) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const role = row.role;
  if (!isRole(role)) throw new HttpError(500, 'Bad stored data');
  const now = Date.now();
  if (int(row, 'seen_at') < now - SEEN_EVERY)
    await sql
      .prepare('UPDATE devices SET seen_at = ?1 WHERE token_hash = ?2')
      .bind(now, tokenHash)
      .run();
  return {
    tokenHash,
    group: { id: text(row, 'group_id'), name: text(row, 'group_name') },
    member: { id: text(row, 'member_id'), name: text(row, 'member_name'), role },
  };
}

/** Refuses an action the caller's role may not do (`shared/capabilities.ts`). */
export function allow(who: Caller, action: Action): void {
  if (!can(who.member.role, action)) throw new HttpError(403, 'Not allowed', 'forbidden');
}
