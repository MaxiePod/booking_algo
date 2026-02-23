import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import type { AuthStep, AuthUser, AuthService, UserRole } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  step: AuthStep;
  authModalVisible: boolean;
  authError: string | null;
  service: AuthService;
  showAuthModal: () => void;
  hideAuthModal: () => void;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  requestAccess: (name: string, email: string, message: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  service: AuthService;
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ service, children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<AuthStep>('idle');
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // Get fresh ID token to read claims
        const tokenResult = await firebaseUser.getIdTokenResult();
        const role = (tokenResult.claims.role as UserRole) || 'user';
        const now = Date.now();
        setUser({
          email: firebaseUser.email,
          role,
          authorizedAt: now,
          expiresAt: now + 30 * 24 * 60 * 60 * 1000,
        });
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const showAuthModal = useCallback(() => {
    setStep('email-input');
    setAuthError(null);
    setAuthModalVisible(true);
  }, []);

  const hideAuthModal = useCallback(() => {
    setAuthModalVisible(false);
    setTimeout(() => setStep('idle'), 300);
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    setStep('sending-otp');
    setAuthError(null);
    try {
      const result = await service.sendOtp(email);
      if (result.sent) {
        if (result.isAuthorized) {
          setStep('otp-input');
        } else {
          setStep('denied');
        }
      } else {
        setAuthError('Failed to send code. Please try again.');
        setStep('email-input');
      }
    } catch {
      setAuthError('Something went wrong. Please try again.');
      setStep('email-input');
    }
  }, [service]);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    setStep('verifying');
    setAuthError(null);
    try {
      const result = await service.verifyOtp(email, code);
      if (result.success && result.user) {
        // Firebase onAuthStateChanged will pick up the sign-in and set user
        setUser(result.user);
        setStep('authorized');
        setTimeout(() => {
          setAuthModalVisible(false);
          setTimeout(() => setStep('idle'), 300);
        }, 1500);
      } else {
        setAuthError('Invalid code. Please try again.');
        setStep('otp-input');
      }
    } catch {
      setAuthError('Verification failed. Please try again.');
      setStep('otp-input');
    }
  }, [service]);

  const requestAccess = useCallback(async (name: string, email: string, message: string) => {
    setAuthError(null);
    try {
      await service.requestAccess({ name, email, message, timestamp: Date.now() });
      setStep('request-sent');
    } catch {
      setAuthError('Failed to submit request. Please try again.');
    }
  }, [service]);

  const logout = useCallback(() => {
    signOut(auth);
    setUser(null);
    setStep('idle');
  }, []);

  const role: UserRole = user?.role ?? 'user';

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    step,
    authModalVisible,
    authError,
    service,
    showAuthModal,
    hideAuthModal,
    sendOtp,
    verifyOtp,
    requestAccess,
    logout,
  };

  // Don't render children until we know if user is signed in
  if (initializing) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
