import type { AuthService, AuthUser, AccessRequest, UserRole } from './types';
import { SESSION_DURATION_MS } from './session';

const MOCK_STORAGE_KEY = 'podplay-mock-auth';
const MOCK_OTP = '123456';

const SUPER_ADMIN_EMAIL = 'max@podplay.app';

interface StoredUser {
  email: string;
  role: UserRole;
  lastLogin?: number;
}

const DEFAULT_AUTHORIZED: StoredUser[] = [
  { email: SUPER_ADMIN_EMAIL, role: 'super_admin' },
];

interface MockStore {
  authorizedUsers: StoredUser[];
  accessRequests: AccessRequest[];
}

/** Migrate old format (authorizedEmails: string[]) to new (authorizedUsers: StoredUser[]) */
function migrateStore(raw: unknown): MockStore | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  // Old format: { authorizedEmails: string[], accessRequests: ... }
  if (Array.isArray(obj.authorizedEmails) && !obj.authorizedUsers) {
    const users: StoredUser[] = (obj.authorizedEmails as string[]).map(email => ({
      email,
      role: email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'super_admin' as const : 'user' as const,
    }));
    return {
      authorizedUsers: users,
      accessRequests: Array.isArray(obj.accessRequests) ? obj.accessRequests as AccessRequest[] : [],
    };
  }
  return null;
}

function loadStore(): MockStore {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Try migration from old format
      const migrated = migrateStore(parsed);
      const store: MockStore = migrated ?? parsed;
      // Always ensure DEFAULT_AUTHORIZED entries are present
      for (const def of DEFAULT_AUTHORIZED) {
        const exists = store.authorizedUsers.some(u => u.email.toLowerCase() === def.email.toLowerCase());
        if (!exists) {
          store.authorizedUsers.push({ ...def });
        } else {
          // Ensure super admin always has super_admin role
          if (def.role === 'super_admin') {
            const entry = store.authorizedUsers.find(u => u.email.toLowerCase() === def.email.toLowerCase())!;
            entry.role = 'super_admin';
          }
        }
      }
      if (migrated) saveStore(store); // persist migration
      return store;
    }
  } catch { /* ignore */ }
  return {
    authorizedUsers: DEFAULT_AUTHORIZED.map(u => ({ ...u })),
    accessRequests: [],
  };
}

function saveStore(store: MockStore): void {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

function lookupRole(store: MockStore, email: string): UserRole {
  if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return 'super_admin';
  const entry = store.authorizedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  return entry?.role ?? 'user';
}

function makeUser(email: string, role: UserRole): AuthUser {
  const now = Date.now();
  return {
    email,
    authorizedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
    role,
  };
}

/** Simulated delay to mimic network */
function delay(ms = 600): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createMockAuthService(): AuthService {
  return {
    async sendOtp(email: string) {
      await delay(400);
      const store = loadStore();
      const isAuthorized = store.authorizedUsers.some(
        u => u.email.toLowerCase() === email.toLowerCase()
      );
      // Always "send" OTP — in mock, OTP is always 123456
      console.log(`[MockAuth] OTP for ${email}: ${MOCK_OTP} (authorized: ${isAuthorized})`);
      return { sent: true, isAuthorized };
    },

    async verifyOtp(email: string, code: string) {
      await delay(500);
      if (code !== MOCK_OTP) {
        return { success: false };
      }
      const store = loadStore();
      const entry = store.authorizedUsers.find(
        u => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!entry) {
        return { success: false };
      }
      // Record last login
      entry.lastLogin = Date.now();
      saveStore(store);
      return { success: true, user: makeUser(email, lookupRole(store, email)) };
    },

    async requestAccess(request: AccessRequest) {
      await delay(300);
      const store = loadStore();
      // Avoid duplicate requests from same email
      const exists = store.accessRequests.some(
        r => r.email.toLowerCase() === request.email.toLowerCase()
      );
      if (!exists) {
        store.accessRequests.push(request);
        saveStore(store);
      }
      console.log(`[MockAuth] Access request from ${request.email}`);
      return { success: true };
    },

    async validateSession(user: AuthUser) {
      const store = loadStore();
      return (
        Date.now() < user.expiresAt &&
        store.authorizedUsers.some(
          u => u.email.toLowerCase() === user.email.toLowerCase()
        )
      );
    },

    // --- Admin ---
    async listAuthorized() {
      const store = loadStore();
      return store.authorizedUsers.map(u => ({
        ...makeUser(u.email, u.role),
        ...(u.lastLogin != null && { lastLogin: u.lastLogin }),
      }));
    },

    async grantAccess(email: string) {
      await delay(200);
      const store = loadStore();
      if (!store.authorizedUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        store.authorizedUsers.push({ email: email.toLowerCase(), role: 'user' });
      }
      // Remove from pending requests
      store.accessRequests = store.accessRequests.filter(
        r => r.email.toLowerCase() !== email.toLowerCase()
      );
      saveStore(store);
      console.log(`[MockAuth] Granted access to ${email}`);
    },

    async revokeAccess(email: string) {
      await delay(200);
      const store = loadStore();
      store.authorizedUsers = store.authorizedUsers.filter(
        u => u.email.toLowerCase() !== email.toLowerCase()
      );
      saveStore(store);
      console.log(`[MockAuth] Revoked access for ${email}`);
    },

    async listAccessRequests() {
      const store = loadStore();
      return store.accessRequests;
    },

    async dismissRequest(email: string) {
      await delay(200);
      const store = loadStore();
      store.accessRequests = store.accessRequests.filter(
        r => r.email.toLowerCase() !== email.toLowerCase()
      );
      saveStore(store);
    },

    async sendInvite(email: string) {
      await delay(300);
      // In mock, just grant access directly
      const store = loadStore();
      if (!store.authorizedUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        store.authorizedUsers.push({ email: email.toLowerCase(), role: 'user' });
      }
      saveStore(store);
      console.log(`[MockAuth] Invite sent to ${email} (auto-granted in mock)`);
    },

    async setRole(email: string, role: UserRole) {
      await delay(200);
      const store = loadStore();
      // Cannot change super admin's role
      if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return;
      const entry = store.authorizedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (entry) {
        entry.role = role;
        saveStore(store);
        console.log(`[MockAuth] Set role for ${email} to ${role}`);
      }
    },
  };
}
