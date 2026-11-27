import { hashToken } from '../../shared/tokens';
import { HttpError } from './http';
import { int, first, type Sql } from './sql';

/**
 * Counts an attempt against a limit in a time window, in the database, and refuses with 429
 * past it. The counter keys never hold an address or a token in clear: only their hashes.
 */
export async function hit(
  sql: Sql,
  what: string,
  who: string,
  limit: number,
  windowSeconds: number,
  now: number = Date.now(),
): Promise<void> {
  const key = `${what}:${await hashToken(who)}`;
  const until = now + windowSeconds * 1000;
  const row = await first(
    sql
      .prepare(
        `INSERT INTO counters (key, until, count) VALUES (?1, ?2, 1)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN counters.until > ?3 THEN counters.count + 1 ELSE 1 END,
           until = CASE WHEN counters.until > ?3 THEN counters.until ELSE ?2 END
         RETURNING count, until`,
      )
      .bind(key, until, now),
  );
  if (row && int(row, 'count') > limit) {
    const retry = Math.max(1, Math.ceil((int(row, 'until') - now) / 1000));
    throw new HttpError(429, 'Too many requests', 'rate-limited', { 'Retry-After': String(retry) });
  }
}

/** Old counters go, now and then, so the table stays small. */
export async function sweep(sql: Sql, now: number = Date.now()): Promise<void> {
  await sql.prepare('DELETE FROM counters WHERE until < ?1').bind(now).run();
}

/** The caller's internet address, as Cloudflare reports it; tests and local runs have none. */
export function address(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'local';
}
