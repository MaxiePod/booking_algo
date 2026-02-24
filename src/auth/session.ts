import type { AuthUser } from './types';

const SESSION_KEY = 'podplay-auth-session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function saveSession(user: AuthUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) {
      clearSession();
      return null;
    }
    // Migrate old format: isAdmin: boolean → role: UserRole
    if (!parsed.role && 'isAdmin' in parsed) {
      parsed.role = parsed.isAdmin ? 'admin' : 'user';
      delete parsed.isAdmin;
      // Re-save migrated session
      localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
    }
    return parsed as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export { SESSION_DURATION_MS };
