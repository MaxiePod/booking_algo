import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { colors, fonts, spacing, borderRadius, transitions } from '../../shared/design-tokens';

const AUTH_MODAL_STYLE_ID = 'podplay-auth-modal-styles';

function ensureAuthModalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(AUTH_MODAL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = AUTH_MODAL_STYLE_ID;
  style.textContent = `
@keyframes podplay-auth-backdrop-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes podplay-auth-slide-up {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes podplay-auth-step-fade {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes podplay-auth-checkmark {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes podplay-auth-spin {
  to { transform: rotate(360deg); }
}
.podplay-auth-backdrop {
  animation: podplay-auth-backdrop-fade 0.3s ease-out forwards;
}
.podplay-auth-modal {
  animation: podplay-auth-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.podplay-auth-step {
  animation: podplay-auth-step-fade 0.25s ease-out forwards;
}
.podplay-auth-checkmark {
  animation: podplay-auth-checkmark 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.podplay-auth-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}
.podplay-auth-btn:active {
  transform: translateY(0);
}
.podplay-auth-input:focus {
  border-color: ${colors.primary} !important;
  outline: none;
  box-shadow: 0 0 0 3px ${colors.primaryLight};
}
.podplay-auth-link:hover {
  color: ${colors.text} !important;
}
`;
  document.head.appendChild(style);
}

/** Icon helper */
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={s.iconWrap}>{children}</div>
);

export const AuthModal: React.FC = () => {
  const {
    authModalVisible, step, authError,
    hideAuthModal, sendOtp, verifyOtp, requestAccess,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  // Local view override for navigating to request-access from other steps
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => { ensureAuthModalStyles(); }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (authModalVisible) {
      setOtpCode('');
      setResendCountdown(0);
      setShowRequestForm(false);
    }
  }, [authModalVisible]);

  // Reset local override when context step changes
  useEffect(() => { setShowRequestForm(false); }, [step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  if (!authModalVisible) return null;

  const handleSendOtp = () => {
    if (!email.trim()) return;
    sendOtp(email.trim().toLowerCase());
    setResendCountdown(30);
  };

  const handleVerify = () => {
    if (!otpCode.trim()) return;
    verifyOtp(email.trim().toLowerCase(), otpCode.trim());
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setOtpCode('');
    sendOtp(email.trim().toLowerCase());
    setResendCountdown(30);
  };

  const handleRequestAccess = () => {
    if (!reqName.trim() || !email.trim()) return;
    requestAccess(reqName.trim(), email.trim().toLowerCase(), reqMessage.trim());
  };

  const onKeyEnter = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  const goToRequestForm = () => {
    setReqName('');
    setReqMessage('');
    setShowRequestForm(true);
  };

  // Determine if close button should be shown (not during loading/success states)
  const showClose = step !== 'authorized' && step !== 'verifying' && step !== 'sending-otp';

  const renderContent = () => {
    // Local request-access form (reachable from email-input or denied)
    if (showRequestForm) {
      return (
        <div className="podplay-auth-step" key="request-form">
          <Icon>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </Icon>
          <h3 style={s.stepTitle}>Request Access</h3>
          <p style={s.stepDesc}>Fill out the form below and we'll review your request.</p>
          {authError && <div style={s.error}>{authError}</div>}
          <input
            className="podplay-auth-input"
            style={s.input}
            type="text"
            placeholder="Your name"
            value={reqName}
            onChange={e => setReqName(e.target.value)}
            autoFocus
          />
          <input
            className="podplay-auth-input"
            style={s.input}
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <textarea
            className="podplay-auth-input"
            style={{ ...s.input, ...s.textarea }}
            placeholder="Why do you need access? (optional)"
            value={reqMessage}
            onChange={e => setReqMessage(e.target.value)}
          />
          <button className="podplay-auth-btn" style={s.primaryBtn} onClick={handleRequestAccess}>
            Submit Request
          </button>
          <button className="podplay-auth-link" style={s.linkBtn} onClick={() => setShowRequestForm(false)}>
            Back
          </button>
        </div>
      );
    }

    switch (step) {
      case 'email-input':
        return (
          <div className="podplay-auth-step" key="email">
            <Icon>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="3,5 12,13 21,5" />
              </svg>
            </Icon>
            <h3 style={s.stepTitle}>Sign In to View Results</h3>
            <p style={s.stepDesc}>Enter your email to receive a one-time verification code.</p>
            {authError && <div style={s.error}>{authError}</div>}
            <input
              className="podplay-auth-input"
              style={s.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => onKeyEnter(e, handleSendOtp)}
              autoFocus
            />
            <button className="podplay-auth-btn" style={s.primaryBtn} onClick={handleSendOtp}>
              Send Code
            </button>
            <button className="podplay-auth-link" style={s.linkBtn} onClick={goToRequestForm}>
              Don't have access? <span style={{ color: colors.primary }}>Request it</span>
            </button>
          </div>
        );

      case 'sending-otp':
        return (
          <div className="podplay-auth-step" key="sending" style={{ textAlign: 'center' }}>
            <div style={s.spinner} />
            <p style={s.stepDesc}>Sending verification code...</p>
          </div>
        );

      case 'otp-input':
        return (
          <div className="podplay-auth-step" key="otp">
            <Icon>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M12 3a4 4 0 0 0-4 4v4h8V7a4 4 0 0 0-4-4z" />
                <circle cx="12" cy="16.5" r="1.5" fill={colors.primary} />
              </svg>
            </Icon>
            <h3 style={s.stepTitle}>Enter Verification Code</h3>
            <p style={s.stepDesc}>
              We sent a 6-digit code to <strong style={{ color: colors.text }}>{email}</strong>
            </p>
            {authError && <div style={s.error}>{authError}</div>}
            <input
              className="podplay-auth-input"
              style={{ ...s.input, ...s.otpInput }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => onKeyEnter(e, handleVerify)}
              autoFocus
            />
            <button className="podplay-auth-btn" style={s.primaryBtn} onClick={handleVerify}>
              Verify
            </button>
            <button
              className="podplay-auth-link"
              style={{ ...s.linkBtn, opacity: resendCountdown > 0 ? 0.5 : 1 }}
              onClick={handleResend}
              disabled={resendCountdown > 0}
            >
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
            </button>
          </div>
        );

      case 'verifying':
        return (
          <div className="podplay-auth-step" key="verifying" style={{ textAlign: 'center' }}>
            <div style={s.spinner} />
            <p style={s.stepDesc}>Verifying...</p>
          </div>
        );

      case 'authorized':
        return (
          <div className="podplay-auth-step" key="authorized" style={{ textAlign: 'center' }}>
            <div className="podplay-auth-checkmark" style={s.successIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="8,12 11,15 16,9" />
              </svg>
            </div>
            <h3 style={{ ...s.stepTitle, color: colors.success }}>You're In!</h3>
            <p style={s.stepDesc}>Results are now unlocked.</p>
          </div>
        );

      case 'denied':
        return (
          <div className="podplay-auth-step" key="denied">
            <Icon>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </Icon>
            <h3 style={{ ...s.stepTitle, color: colors.danger }}>Not Authorized</h3>
            <p style={s.stepDesc}>
              This email doesn't have access to simulator results. You can request access below.
            </p>
            <button className="podplay-auth-btn" style={s.primaryBtn} onClick={goToRequestForm}>
              Request Access
            </button>
            <button className="podplay-auth-link" style={s.linkBtn} onClick={hideAuthModal}>
              Close
            </button>
          </div>
        );

      case 'request-sent':
        return (
          <div className="podplay-auth-step" key="sent" style={{ textAlign: 'center' }}>
            <div className="podplay-auth-checkmark" style={s.successIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            <h3 style={{ ...s.stepTitle, color: colors.success }}>Request Sent!</h3>
            <p style={s.stepDesc}>
              We'll notify you at <strong style={{ color: colors.text }}>{email}</strong> when your access is granted.
            </p>
            <button className="podplay-auth-btn" style={s.primaryBtn} onClick={hideAuthModal}>
              Close
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="podplay-auth-step" key="error" style={{ textAlign: 'center' }}>
            <p style={{ ...s.stepDesc, color: colors.danger }}>{authError || 'An error occurred.'}</p>
            <button className="podplay-auth-btn" style={s.primaryBtn} onClick={hideAuthModal}>
              Close
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="podplay-auth-backdrop" style={s.backdrop} onClick={hideAuthModal}>
      <div className="podplay-auth-modal" style={s.modal} onClick={e => e.stopPropagation()}>
        {showClose && (
          <button style={s.closeBtn} onClick={hideAuthModal} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    maxWidth: '420px',
    width: '100%',
    padding: spacing.xl,
    position: 'relative',
    textAlign: 'center' as const,
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xs,
    transition: `color ${transitions.fast}`,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightBold,
    color: colors.text,
    margin: 0,
    marginBottom: spacing.sm,
  },
  stepDesc: {
    fontSize: fonts.sizeBase,
    color: colors.textSecondary,
    margin: 0,
    marginBottom: spacing.lg,
    lineHeight: 1.6,
  },
  error: {
    fontSize: fonts.sizeSmall,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  input: {
    width: '100%',
    padding: spacing.md,
    fontSize: fonts.sizeBase,
    fontFamily: fonts.family,
    backgroundColor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}`,
  },
  otpInput: {
    fontFamily: fonts.mono,
    fontSize: '24px',
    textAlign: 'center' as const,
    letterSpacing: '0.3em',
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical' as const,
    fontFamily: fonts.family,
  },
  primaryBtn: {
    width: '100%',
    padding: spacing.md,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    fontFamily: fonts.family,
    color: '#ffffff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    marginBottom: spacing.sm,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    fontSize: fonts.sizeSmall,
    cursor: 'pointer',
    padding: spacing.sm,
    fontFamily: fonts.family,
    transition: `color ${transitions.fast}`,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${colors.border}`,
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'podplay-auth-spin 0.8s linear infinite',
    margin: `${spacing.lg} auto`,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
};
