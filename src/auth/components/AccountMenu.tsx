import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { colors, fonts, spacing, borderRadius, shadows, transitions } from '../../shared/design-tokens';

interface AccountMenuProps {
  onAdminClick: () => void;
}

function getInitials(email: string, name?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  // Fallback: first two chars of email prefix
  const prefix = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
  return (prefix.slice(0, 2) || 'U').toUpperCase();
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onAdminClick }) => {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const initials = getInitials(user.email, user.name);

  return (
    <div ref={menuRef} style={styles.container}>
      <button
        style={styles.avatar}
        onClick={() => setOpen(prev => !prev)}
        title={user.email}
      >
        {initials}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.emailRow}>{user.email}</div>
          <div style={styles.divider} />
          {isAdmin && (
            <button
              style={styles.menuItem}
              onClick={() => { onAdminClick(); setOpen(false); }}
              onMouseEnter={e => Object.assign(e.currentTarget.style, styles.menuItemHover)}
              onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, opacity: 0.7 }}>
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Admin Panel
            </button>
          )}
          <button
            style={styles.menuItem}
            onClick={() => { logout(); setOpen(false); }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, styles.menuItemHover)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, opacity: 0.7 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '14px',
    right: '100px',
    zIndex: 1001,
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: borderRadius.full,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    fontSize: fonts.sizeSmall,
    fontWeight: fonts.weightMedium,
    fontFamily: fonts.family,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: fonts.trackingWide,
    transition: `all ${transitions.fast}`,
  },
  dropdown: {
    position: 'absolute',
    top: '42px',
    right: 0,
    minWidth: '200px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
    padding: `${spacing.xs} 0`,
    animation: 'podplay-scale-in 0.15s ease-out',
    transformOrigin: 'top right',
  },
  emailRow: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    fontFamily: fonts.family,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: '1px',
    backgroundColor: colors.borderLight,
    margin: `${spacing.xs} 0`,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: fonts.sizeBase,
    fontFamily: fonts.family,
    fontWeight: fonts.weightMedium,
    cursor: 'pointer',
    textAlign: 'left',
    transition: `background-color ${transitions.fast}`,
  },
  menuItemHover: {
    backgroundColor: colors.surfaceHover,
  },
};
