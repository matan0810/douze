import {
  isErrorCode,
  parseAudit,
  parseGroupView,
  parseJoined,
  parsePreview,
  type AuditEntry,
  type ErrorCode,
  type GroupView,
  type Joined,
  type Preview,
} from '../../shared/groups';
import { isSecret } from '../../shared/ids';
import { serverOrigin } from '../../shared/origin';

/**
 * The server, as the site sees it (SERVER.md; the Worker in `worker/`). Its address comes from
 * the build (`VITE_API_URL`); without one, there are no groups on this build. Every answer
 * is parsed by the same code the server uses (`shared/groups.ts`), never cast.
 */
export type Failure = ErrorCode | 'network' | 'unknown';
export type Result<T> = { ok: true; value: T } | { ok: false; error: Failure };

/** The API's origin, if this build has one (`shared/origin.ts`). */
export function apiOrigin(): string | undefined {
  return serverOrigin(import.meta.env.VITE_API_URL);
}

const TIMEOUT = 10_000;

interface Call {
  method: string;
  path: string;
  token?: string;
  invite?: string;
  body?: unknown;
}

async function call<T>(
  { method, path, token, invite, body }: Call,
  parse: (value: unknown) => T | undefined,
): Promise<Result<T>> {
  const origin = apiOrigin();
  if (!origin) return { ok: false, error: 'network' };
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (invite) headers['X-Invite'] = invite;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof data === 'object' && data !== null && 'code' in data ? data.code : undefined;
    return { ok: false, error: isErrorCode(code) ? code : 'unknown' };
  }
  const value = parse(data);
  return value === undefined ? { ok: false, error: 'unknown' } : { ok: true, value };
}

const nothing = (): null => null;
const inviteOf = (value: unknown) =>
  typeof value === 'object' && value !== null && 'invite' in value && isSecret(value.invite)
    ? value.invite
    : undefined;

export const api = {
  createGroup: (group: string, me: string): Promise<Result<Joined>> =>
    call({ method: 'POST', path: '/groups', body: { group, me } }, parseJoined),
  readGroup: (id: string, token: string): Promise<Result<GroupView>> =>
    call({ method: 'GET', path: `/groups/${id}`, token }, parseGroupView),
  preview: (id: string, invite: string): Promise<Result<Preview>> =>
    call({ method: 'GET', path: `/groups/${id}/preview`, invite }, parsePreview),
  join: (id: string, invite: string, name: string, takeover: boolean): Promise<Result<Joined>> =>
    call(
      { method: 'POST', path: `/groups/${id}/join`, invite, body: { name, takeover } },
      parseJoined,
    ),
  renewInvite: (id: string, token: string): Promise<Result<string>> =>
    call({ method: 'POST', path: `/groups/${id}/invite`, token }, inviteOf),
  setRole: (id: string, token: string, member: string, role: 'admin' | 'member') =>
    call(
      { method: 'PUT', path: `/groups/${id}/members/${member}/role`, token, body: { role } },
      parseGroupView,
    ),
  release: (id: string, token: string, member: string) =>
    call(
      { method: 'DELETE', path: `/groups/${id}/members/${member}/devices`, token },
      parseGroupView,
    ),
  leave: (id: string, token: string): Promise<Result<null>> =>
    call({ method: 'DELETE', path: `/groups/${id}/members/me`, token }, nothing),
  deleteGroup: (id: string, token: string, confirm: string): Promise<Result<null>> =>
    call({ method: 'DELETE', path: `/groups/${id}`, token, body: { confirm } }, nothing),
  audit: (id: string, token: string): Promise<Result<AuditEntry[]>> =>
    call({ method: 'GET', path: `/groups/${id}/audit`, token }, parseAudit),
};
