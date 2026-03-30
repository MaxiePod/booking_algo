import React, { useState, useEffect, useCallback } from 'react';
import { SavingsCalculator } from './calculator/SavingsCalculator';
import { SimulatorPage } from './simulator/SimulatorPage';
import { AuthModal } from './auth/components/AuthModal';
import { AdminPanel } from './auth/components/AdminPanel';
import { AccountMenu } from './auth/components/AccountMenu';
import { useAuth } from './auth/AuthContext';
import { colors, fonts, spacing, borderRadius, shadows, transitions } from './shared/design-tokens';

type Tab = 'calculator' | 'simulator' | 'admin';

const APP_VERSION = 'v1.5.11';

function getTabFromPath(): Tab {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/simulator') return 'simulator';
  if (path === '/admin') return 'admin';
  return 'calculator';
}

function getPathForTab(tab: Tab): string {
  if (tab === 'simulator') return '/simulator';
  if (tab === 'admin') return '/admin';
  return '/';
}

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>(getTabFromPath);
  const [isHovered, setIsHovered] = useState<Tab | null>(null);
  const { isAuthenticated, showAuthModal } = useAuth();

  const switchTab = useCallback((newTab: Tab) => {
    setTab(newTab);
    const path = getPathForTab(newTab);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => setTab(getTabFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div style={styles.page}>
      {/* Subtle gradient background accent */}
      <div style={styles.bgAccent} />

      {/* Version badge + Account menu / Sign In */}
      {isAuthenticated
        ? <AccountMenu onAdminClick={() => switchTab('admin')} />
        : <button style={styles.signInBtn} onClick={showAuthModal}>Sign In</button>
      }
      <div style={styles.version}>{APP_VERSION}</div>

      {/* Auth modal (always mounted, visibility controlled by context) */}
      <AuthModal />

      {/* Logo / Brand */}
      <div style={styles.brand}>
        <span style={styles.brandText}>
          <span style={styles.brandPod}>Pod</span>
          <span style={styles.brandPlay}>Play</span>
        </span>
        <span style={styles.brandDivider} />
        <span style={styles.brandSub}>Court Optimizer</span>
      </div>

      {/* Tab navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          {/* Animated background indicator */}
          <div
            style={{
              ...styles.navIndicator,
              transform: tab === 'calculator' ? 'translateX(0)' : tab === 'simulator' ? 'translateX(100%)' : 'translateX(200%)',
              ...(tab === 'admin' ? { display: 'none' } : {}),
            }}
          />
          <button
            style={{
              ...styles.tab,
              ...(tab === 'calculator' ? styles.tabActive : {}),
              ...(isHovered === 'calculator' && tab !== 'calculator' ? styles.tabHover : {}),
            }}
            onClick={() => switchTab('calculator')}
            onMouseEnter={() => setIsHovered('calculator')}
            onMouseLeave={() => setIsHovered(null)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6, opacity: 0.8 }}>
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm2 1v2h3V4H4zm5 0v2h3V4H9zM4 8v2h3V8H4zm5 0v2h3V8H9zm-5 4v1h3v-1H4zm5 0v1h3v-1H9z" />
            </svg>
            Savings Calculator
          </button>
          <button
            style={{
              ...styles.tab,
              ...(tab === 'simulator' ? styles.tabActive : {}),
              ...(isHovered === 'simulator' && tab !== 'simulator' ? styles.tabHover : {}),
            }}
            onClick={() => switchTab('simulator')}
            onMouseEnter={() => setIsHovered('simulator')}
            onMouseLeave={() => setIsHovered(null)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6, opacity: 0.8 }}>
              <path d="M1 3.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9zM3 5v2h2V5H3zm4 0v2h6V5H7zM3 9v2h2V9H3zm4 0v2h6V9H7z" />
            </svg>
            Algorithm Simulator
          </button>
        </div>
      </nav>

      {/* Content area with fade animation */}
      <div key={tab} className="podplay-fade-in">
        {tab === 'calculator' && <SavingsCalculator />}
        {tab === 'simulator' && <SimulatorPage />}
        {tab === 'admin' && <AdminPanel />}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>
          Built for court facility operators • Optimized scheduling = More revenue
        </span>
        <br />
        <span style={styles.footerCopy}>
          &copy; {new Date().getFullYear()} PodPlay Technologies, Inc. All rights reserved.
        </span>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.pageBg,
    padding: '24px 16px 64px',
    fontFamily: fonts.family,
    position: 'relative',
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '150%',
    height: '600px',
    background: `radial-gradient(ellipse at 50% 0%, ${colors.accentLight} 0%, transparent 50%)`,
    pointerEvents: 'none',
    opacity: 0.6,
  },
  version: {
    position: 'fixed',
    top: '16px',
    right: '20px',
    fontSize: fonts.sizeXs,
    fontWeight: fonts.weightMedium,
    color: colors.textMuted,
    fontFamily: fonts.mono,
    backgroundColor: colors.surface,
    padding: '6px 12px',
    borderRadius: borderRadius.full,
    border: `1px solid ${colors.border}`,
    zIndex: 1000,
    letterSpacing: fonts.trackingWide,
  },
  signInBtn: {
    position: 'fixed',
    top: '16px',
    right: '100px',
    zIndex: 1001,
    padding: '6px 16px',
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    fontFamily: fonts.family,
    color: '#ffffff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.full,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    letterSpacing: fonts.trackingWide,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
    zIndex: 1,
    gap: spacing.md,
  },
  brandText: {
    fontSize: '28px',
    fontWeight: fonts.weightLight,
    letterSpacing: '-0.02em',
  },
  brandPod: {
    color: colors.text,
  },
  brandPlay: {
    color: colors.primary,
  },
  brandDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: colors.border,
  },
  brandSub: {
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    position: 'relative',
    zIndex: 1,
  },
  navInner: {
    display: 'flex',
    position: 'relative',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: '4px',
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.md,
  },
  navIndicator: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    width: 'calc(50% - 4px)',
    height: 'calc(100% - 8px)',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    transition: `transform ${transitions.normal}`,
    boxShadow: shadows.sm,
  },
  tab: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    border: 'none',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    color: colors.textMuted,
    fontSize: fonts.sizeBase,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: `color ${transitions.fast}`,
    zIndex: 1,
    minWidth: '180px',
  },
  tabActive: {
    color: colors.text,
    fontWeight: fonts.weightSemibold,
  },
  tabHover: {
    color: colors.textSecondary,
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: `${spacing.md} ${spacing.lg}`,
    textAlign: 'center',
    backgroundColor: colors.pageBg,
    borderTop: `1px solid ${colors.borderLight}`,
  },
  footerText: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    fontWeight: fonts.weightLight,
  },
  footerCopy: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    fontWeight: fonts.weightLight,
    opacity: 0.7,
  },
};

export default App;
