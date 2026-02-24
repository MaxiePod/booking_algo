import React from 'react';
import { useAuth } from '../AuthContext';
import { colors, fonts, spacing, borderRadius, transitions } from '../../shared/design-tokens';

interface AuthGatedResultsProps {
  hasResults: boolean;
  children: React.ReactNode;
}

export const AuthGatedResults: React.FC<AuthGatedResultsProps> = ({ hasResults, children }) => {
  const { isAuthenticated, showAuthModal } = useAuth();

  // If authenticated, render children normally
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If no results yet, just render children (nothing to blur)
  if (!hasResults) {
    return <>{children}</>;
  }

  // Results exist but user not authenticated: blur + overlay
  return (
    <div style={styles.wrapper}>
      <div style={styles.blurredContent}>
        {children}
      </div>
      <div style={styles.overlay}>
        <div style={styles.card}>
          {/* Lock icon */}
          <div style={styles.lockIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M12 3a4 4 0 0 0-4 4v4h8V7a4 4 0 0 0-4-4z" />
              <circle cx="12" cy="16.5" r="1.5" fill={colors.primary} />
            </svg>
          </div>
          <h3 style={styles.cardTitle}>Unlock Simulation Results</h3>
          <p style={styles.cardDesc}>
            Sign in with an authorized email to view detailed results, timelines, and heatmaps.
          </p>
          <button
            style={styles.signInBtn}
            onClick={showAuthModal}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = `0 6px 20px rgba(139, 139, 139, 0.3)`;
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
  },
  blurredContent: {
    filter: 'blur(8px)',
    pointerEvents: 'none',
    userSelect: 'none',
    transition: `filter 0.5s ease`,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '80px',
    zIndex: 10,
  },
  card: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    textAlign: 'center' as const,
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  lockIcon: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fonts.sizeLg,
    fontWeight: fonts.weightBold,
    color: colors.text,
    margin: 0,
    marginBottom: spacing.sm,
  },
  cardDesc: {
    fontSize: fonts.sizeBase,
    color: colors.textSecondary,
    margin: 0,
    marginBottom: spacing.lg,
    lineHeight: 1.6,
  },
  signInBtn: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: borderRadius.sm,
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    fontFamily: fonts.family,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    width: '100%',
  },
};
