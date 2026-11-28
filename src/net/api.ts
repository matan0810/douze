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
import { parseMe, parseSession, type Me, type Session } from '../../shared/accounts';
import { serverOrigin } from '../../shared/origin';
import { loadSession } from '../state/session';
import {
  parseYears,
  parseYearView,
  type Entry,
  type Stage,
  type StageSetup,
  type YearView,
} from '../../shared/years';

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
  invite?: string;
  body?: unknown;
}

async function call<T>(
  { method, path, invite, body }: Call,
  parse: (value: unknown) => T | undefined,
): Promise<Result<T>> {
  const origin = apiOrigin();
  if (!origin) return { ok: false, error: 'network' };
  const headers: Record<string, string> = {};
  // Whoever is signed in on this device speaks for themselves: no screen passes a token.
  const token = loadSession()?.token;
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
  collectSession: (code: string): Promise<Result<Session>> =>
    call({ method: 'POST', path: '/auth/session', body: { code } }, parseSession),
  signOut: (): Promise<Result<null>> => call({ method: 'DELETE', path: '/auth/session' }, nothing),
  me: (): Promise<Result<Me>> => call({ method: 'GET', path: '/me' }, parseMe),
  createGroup: (group: string, me: string): Promise<Result<Joined>> =>
    call({ method: 'POST', path: '/groups', body: { group, me } }, parseJoined),
  readGroup: (id: string): Promise<Result<GroupView>> =>
    call({ method: 'GET', path: `/groups/${id}` }, parseGroupView),
  preview: (id: string, invite: string): Promise<Result<Preview>> =>
    call({ method: 'GET', path: `/groups/${id}/preview`, invite }, parsePreview),
  join: (id: string, invite: string, name: string, claim: boolean): Promise<Result<Joined>> =>
    call(
      { method: 'POST', path: `/groups/${id}/join`, invite, body: { name, claim } },
      parseJoined,
    ),
  renewInvite: (id: string): Promise<Result<string>> =>
    call({ method: 'POST', path: `/groups/${id}/invite` }, inviteOf),
  setRole: (id: string, member: string, role: 'admin' | 'member') =>
    call(
      { method: 'PUT', path: `/groups/${id}/members/${member}/role`, body: { role } },
      parseGroupView,
    ),
  release: (id: string, member: string) =>
    call({ method: 'DELETE', path: `/groups/${id}/members/${member}/claim` }, parseGroupView),
  leave: (id: string): Promise<Result<null>> =>
    call({ method: 'DELETE', path: `/groups/${id}/members/me` }, nothing),
  deleteGroup: (id: string, confirm: string): Promise<Result<null>> =>
    call({ method: 'DELETE', path: `/groups/${id}`, body: { confirm } }, nothing),
  audit: (id: string): Promise<Result<AuditEntry[]>> =>
    call({ method: 'GET', path: `/groups/${id}/audit` }, parseAudit),
  years: (id: string): Promise<Result<number[]>> =>
    call({ method: 'GET', path: `/groups/${id}/years` }, parseYears),
  readYear: (id: string, year: number): Promise<Result<YearView>> =>
    call({ method: 'GET', path: `/groups/${id}/years/${year}` }, parseYearView),
  setStage: (id: string, year: number, stage: Stage, setup: StageSetup) =>
    call(
      { method: 'PUT', path: `/groups/${id}/years/${year}/${stage}`, body: setup },
      parseYearView,
    ),
  removeStage: (id: string, year: number, stage: Stage) =>
    call({ method: 'DELETE', path: `/groups/${id}/years/${year}/${stage}` }, parseYearView),
  closeStage: (id: string, year: number, stage: Stage) =>
    call({ method: 'POST', path: `/groups/${id}/years/${year}/${stage}/close` }, parseYearView),
  setResult: (id: string, year: number, stage: Stage, result: string[] | null) =>
    call(
      {
        method: 'PUT',
        path: `/groups/${id}/years/${year}/${stage}/result`,
        body: { result },
      },
      parseYearView,
    ),
  saveEntry: (id: string, year: number, stage: Stage, entry: Entry) =>
    call(
      { method: 'PUT', path: `/groups/${id}/years/${year}/${stage}/entry`, body: entry },
      parseYearView,
    ),
};

/** Where to send a person to sign in with Google: the Worker, which sends them on and back. */
export function signInUrl(returnTo: string): string | undefined {
  const origin = apiOrigin();
  return origin ? `${origin}/auth/google/start?return=${encodeURIComponent(returnTo)}` : undefined;
}
