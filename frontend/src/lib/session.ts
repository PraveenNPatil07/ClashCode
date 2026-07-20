import type { User } from '@clashcode/shared';

const SESSION_KEY = 'clashcode_session';

type Session = {
  user: User;
};

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function syncSessionUser(user: User) {
  const nextSession = { user };
  saveSession(nextSession);
  return nextSession;
}
