import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase-config';
import type { AuthService, AuthUser, AccessRequest, UserRole } from './types';

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function createFirebaseAuthService(): AuthService {
  return {
    async sendOtp(email: string) {
      const resp = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      return { sent: data.sent ?? false, isAuthorized: data.isAuthorized ?? false };
    },

    async verifyOtp(email: string, code: string) {
      const resp = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await resp.json();

      if (!data.success || !data.customToken) {
        return { success: false };
      }

      // Sign into Firebase with the custom token
      await signInWithCustomToken(auth, data.customToken);

      return { success: true, user: data.user as AuthUser };
    },

    async requestAccess(request: AccessRequest) {
      const resp = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await resp.json();
      return { success: data.success ?? false };
    },

    async validateSession(_user: AuthUser) {
      const token = await getIdToken();
      if (!token) return false;
      const resp = await fetch('/api/validate-session', {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await resp.json();
      return data.valid ?? false;
    },

    // --- Admin methods ---

    async listAuthorized(): Promise<AuthUser[]> {
      const resp = await fetch('/api/admin/list-authorized', {
        headers: await authHeaders(),
      });
      if (!resp.ok) return [];
      return resp.json();
    },

    async grantAccess(email: string) {
      await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email }),
      });
    },

    async revokeAccess(email: string) {
      await fetch('/api/admin/revoke-access', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email }),
      });
    },

    async listAccessRequests(): Promise<AccessRequest[]> {
      const resp = await fetch('/api/admin/list-requests', {
        headers: await authHeaders(),
      });
      if (!resp.ok) return [];
      return resp.json();
    },

    async dismissRequest(email: string) {
      await fetch('/api/admin/dismiss-request', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email }),
      });
    },

    async sendInvite(email: string) {
      await fetch('/api/admin/send-invite', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email }),
      });
    },

    async setRole(email: string, role: UserRole) {
      await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ email, role }),
      });
    },
  };
}
