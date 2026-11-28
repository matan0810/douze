import { can, isRole, type Action, type Role } from '../../shared/capabilities';
import { isSecret } from '../../shared/ids';
import { hashToken } from '../../shared/tokens';
import { HttpError } from './http';
import { first, int, text, type Sql } from './sql';

/** Who is asking: a signed-in account (a Google account, on any device). */
export interface Signed {
  /** The session token's hash: what rate limits count, never the address or the token. */
  tokenHash: string;
  account: { id: string; name: string };
}

/** Who is asking in one group: the account, and the member it is there. */
export interface Caller extends Signed {
  group: { id: string; name: string };
  member: { id: string; name: string; role: Role };
}

/** How often a session's "last seen" is written: at most once an hour, to spare writes. */
const SEEN_EVERY = 60 * 60 * 1000;

/** The signed-in account behind the bearer token in `Authorization`; 401 if none fits. */
export async function signedIn(request: Request, sql: Sql): Promise<Signed> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!isSecret(token)) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const tokenHash = await hashToken(token);
  const row = await first(
    sql
      .prepare(
        `SELECT s.seen_at, a.id AS account_id, a.name AS account_name
         FROM sessions s JOIN accounts a ON a.id = s.account_id
         WHERE s.token_hash = ?1 AND s.expires_at > ?2`,
      )
      .bind(tokenHash, Date.now()),
  );
  if (!row) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const now = Date.now();
  if (int(row, 'seen_at') < now - SEEN_EVERY)
    await sql
      .prepare('UPDATE sessions SET seen_at = ?1 WHERE token_hash = ?2')
      .bind(now, tokenHash)
      .run();
  return { tokenHash, account: { id: text(row, 'account_id'), name: text(row, 'account_name') } };
}

/** The caller of a group's request: signed in, and a member of that group; 401 if not both. */
export async function caller(request: Request, sql: Sql, groupId: string): Promise<Caller> {
  const who = await signedIn(request, sql);
  const row = await first(
    sql
      .prepare(
        `SELECT m.id AS member_id, m.name AS member_name, m.role, g.id AS group_id, g.name AS group_name
         FROM members m JOIN groups g ON g.id = m.group_id
         WHERE m.account_id = ?1 AND m.group_id = ?2`,
      )
      .bind(who.account.id, groupId),
  );
  if (!row) throw new HttpError(401, 'Not signed in', 'unauthorized');
  const role = row.role;
  if (!isRole(role)) throw new HttpError(500, 'Bad stored data');
  return {
    ...who,
    group: { id: text(row, 'group_id'), name: text(row, 'group_name') },
    member: { id: text(row, 'member_id'), name: text(row, 'member_name'), role },
  };
}

/** Refuses an action the caller's role may not do (`shared/capabilities.ts`). */
export function allow(who: Caller, action: Action): void {
  if (!can(who.member.role, action)) throw new HttpError(403, 'Not allowed', 'forbidden');
}
