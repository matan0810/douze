import { useSyncExternalStore } from 'react';
import { parseSession, type Session } from '../../shared/accounts';

/**
 * Who is signed in on this device (SECURITY.md): the session the server gave after Google
 * said who this is. Kept in `localStorage`, read back checked, and cleared on sign-out.
 */
export const SESSION_KEY = 'eurorank:session';
/** Where to go once signed in: the address the person was on when they were sent to Google. */
const AFTER_KEY = 'eurorank:after-sign-in';
const CHANGED = 'eurorank:session-changed';

export function loadSession(): Session | undefined {
  try {
    return parseSession(JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null'));
  } catch {
    return undefined;
  }
}

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Best effort: in a private window the session lasts for the visit only.
  }
  announce();
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  announce();
}

/** Remembers the address to come back to after Google; read once by `takeAfterSignIn`. */
export function rememberAfterSignIn(hash: string) {
  try {
    sessionStorage.setItem(AFTER_KEY, hash);
  } catch {
    // Without it the person lands on the groups page.
  }
}

export function takeAfterSignIn(): string | undefined {
  try {
    const hash = sessionStorage.getItem(AFTER_KEY) ?? undefined;
    sessionStorage.removeItem(AFTER_KEY);
    // Only the site's own screens: a stored address is checked like any other input.
    return hash && /^#\/[\w/-]{0,200}$/.test(hash) ? hash : undefined;
  } catch {
    return undefined;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener('storage', listener);
  };
}

let last: { raw: string | null; value: Session | undefined } = { raw: null, value: undefined };

/** The session as a snapshot that only changes when what is stored does. */
function snapshot(): Session | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SESSION_KEY);
  } catch {
    raw = null;
  }
  if (raw !== last.raw) last = { raw, value: loadSession() };
  return last.value;
}

/** The signed-in person, if any, and the screen updates when it changes. */
export function useSession(): Session | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
