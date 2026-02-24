/** Auth flow step states */
export type AuthStep =
  | 'idle'
  | 'email-input'
  | 'sending-otp'
  | 'otp-input'
  | 'verifying'
  | 'authorized'
  | 'denied'
  | 'request-access'
  | 'request-sent'
  | 'error';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface AuthUser {
  email: string;
  name?: string;
  authorizedAt: number;
  expiresAt: number;
  role: UserRole;
}

export interface AccessRequest {
  name: string;
  email: string;
  message: string;
  timestamp: number;
}

export interface AuthService {
  /** Send a one-time passcode to the given email. Returns true if email is recognized. */
  sendOtp(email: string): Promise<{ sent: boolean; isAuthorized: boolean }>;

  /** Verify the OTP code for the given email. Returns AuthUser on success. */
  verifyOtp(email: string, code: string): Promise<{ success: boolean; user?: AuthUser }>;

  /** Submit an access request (for unauthorized users). */
  requestAccess(request: AccessRequest): Promise<{ success: boolean }>;

  /** Check if a stored session is still valid. */
  validateSession(user: AuthUser): Promise<boolean>;

  // --- Admin methods ---
  listAuthorized(): Promise<AuthUser[]>;
  grantAccess(email: string): Promise<void>;
  revokeAccess(email: string): Promise<void>;
  listAccessRequests(): Promise<AccessRequest[]>;
  dismissRequest(email: string): Promise<void>;
  sendInvite(email: string): Promise<void>;
  setRole(email: string, role: UserRole): Promise<void>;
}
