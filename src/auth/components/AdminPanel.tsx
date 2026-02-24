import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import type { AuthUser, AccessRequest } from '../types';
import { colors, fonts, spacing, borderRadius, transitions } from '../../shared/design-tokens';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export const AdminPanel: React.FC = () => {
  const { isAdmin, isSuperAdmin, user, service } = useAuth();
  const [authorized, setAuthorized] = useState<AuthUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [authList, reqList] = await Promise.all([
        service.listAuthorized(),
        service.listAccessRequests(),
      ]);
      setAuthorized(authList);
      setRequests(reqList);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  if (!isAdmin) return null;

  const handleGrant = async (email: string) => {
    await service.grantAccess(email);
    setMessage(`Granted access to ${email}`);
    refresh();
  };

  const handleRevoke = async (email: string) => {
    if (email === user?.email) return; // Can't revoke self
    await service.revokeAccess(email);
    setMessage(`Revoked access for ${email}`);
    refresh();
  };

  const handleDismiss = async (email: string) => {
    await service.dismissRequest(email);
    refresh();
  };

  const handlePromote = async (email: string) => {
    await service.setRole(email, 'admin');
    setMessage(`Promoted ${email} to admin`);
    refresh();
  };

  const handleDemote = async (email: string) => {
    await service.setRole(email, 'user');
    setMessage(`Removed admin role from ${email}`);
    refresh();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    await service.sendInvite(inviteEmail.trim().toLowerCase());
    setMessage(`Invited ${inviteEmail.trim()}`);
    setInviteEmail('');
    refresh();
  };

  // Clear message after 3s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Admin Panel</h2>
        <p style={s.subtitle}>Manage authorized users and access requests</p>
      </div>

      {message && <div style={s.toast}>{message}</div>}

      {/* Invite section */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Send Invite</h3>
        <div style={s.inviteRow}>
          <input
            style={s.input}
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <button style={s.actionBtn} onClick={handleInvite}>
            Invite
          </button>
        </div>
      </div>

      {/* Authorized users */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          Authorized Users ({authorized.length})
        </h3>
        {loading ? (
          <p style={s.muted}>Loading...</p>
        ) : authorized.length === 0 ? (
          <p style={s.muted}>No authorized users</p>
        ) : (
          <div style={s.list}>
            {authorized.map(u => {
              // Super admin sees lastLogin for everyone; admin sees it only for 'user' role
              const showLastLogin = isSuperAdmin || u.role === 'user';
              return (
              <div key={u.email} style={s.listItem}>
                <div>
                  <span style={s.email}>{u.email}</span>
                  {u.role === 'super_admin' && <span style={s.badgeSuperAdmin}>super admin</span>}
                  {u.role === 'admin' && <span style={s.badge}>admin</span>}
                  {showLastLogin && (
                    <span style={s.lastLogin}>
                      {u.lastLogin ? `Last login: ${formatTimeAgo(u.lastLogin)}` : 'Never logged in'}
                    </span>
                  )}
                </div>
                <div style={s.requestActions}>
                  {/* Promote/demote: only super_admin can see these, and not on themselves or other super_admins */}
                  {isSuperAdmin && u.email !== user?.email && u.role === 'user' && (
                    <button style={s.promoteBtn} onClick={() => handlePromote(u.email)}>
                      Make Admin
                    </button>
                  )}
                  {isSuperAdmin && u.email !== user?.email && u.role === 'admin' && (
                    <button style={s.demoteBtn} onClick={() => handleDemote(u.email)}>
                      Remove Admin
                    </button>
                  )}
                  {u.email !== user?.email && u.role !== 'super_admin' && (
                    <button
                      style={s.revokeBtn}
                      onClick={() => handleRevoke(u.email)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending requests */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          Pending Requests ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <p style={s.muted}>No pending requests</p>
        ) : (
          <div style={s.list}>
            {requests.map(r => (
              <div key={r.email} style={s.listItem}>
                <div>
                  <span style={s.name}>{r.name}</span>
                  <span style={s.requestEmail}>{r.email}</span>
                  {r.message && <p style={s.requestMsg}>"{r.message}"</p>}
                  <span style={s.timestamp}>
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div style={s.requestActions}>
                  <button style={s.grantBtn} onClick={() => handleGrant(r.email)}>
                    Grant
                  </button>
                  <button style={s.revokeBtn} onClick={() => handleDismiss(r.email)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: spacing.xl,
    fontFamily: fonts.family,
    color: colors.text,
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: fonts.sizeXl,
    fontWeight: fonts.weightBold,
    margin: 0,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fonts.sizeBase,
    color: colors.textSecondary,
    margin: 0,
  },
  toast: {
    backgroundColor: colors.successLight,
    color: colors.success,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.sm,
    fontSize: fonts.sizeSmall,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
  },
  section: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.sizeMd,
    fontWeight: fonts.weightSemibold,
    color: colors.text,
    margin: 0,
    marginBottom: spacing.md,
  },
  inviteRow: {
    display: 'flex',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    padding: spacing.sm,
    fontSize: fonts.sizeBase,
    fontFamily: fonts.family,
    backgroundColor: colors.background,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.sm,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.borderLight}`,
  },
  email: {
    fontSize: fonts.sizeBase,
    color: colors.text,
    fontFamily: fonts.mono,
  },
  name: {
    fontSize: fonts.sizeBase,
    color: colors.text,
    display: 'block',
    marginBottom: '2px',
  },
  requestEmail: {
    fontSize: fonts.sizeBase,
    color: colors.text,
    fontFamily: fonts.mono,
    display: 'block',
    marginBottom: '2px',
  },
  badge: {
    display: 'inline-block',
    fontSize: fonts.sizeXs,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    padding: '2px 8px',
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
  },
  badgeSuperAdmin: {
    display: 'inline-block',
    fontSize: fonts.sizeXs,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '2px 8px',
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: fonts.trackingWide,
  },
  lastLogin: {
    display: 'block',
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
    marginTop: '2px',
  },
  requestMsg: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    margin: `${spacing.xs} 0`,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: fonts.sizeXs,
    color: colors.textMuted,
  },
  requestActions: {
    display: 'flex',
    gap: spacing.xs,
  },
  actionBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    fontFamily: fonts.family,
    color: '#ffffff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  grantBtn: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    fontFamily: fonts.family,
    color: '#ffffff',
    backgroundColor: colors.success,
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  revokeBtn: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    fontFamily: fonts.family,
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    border: `1px solid ${colors.danger}`,
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  promoteBtn: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    fontFamily: fonts.family,
    color: '#ffffff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  demoteBtn: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: fonts.sizeSmall,
    fontFamily: fonts.family,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    border: '1px solid #b45309',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
  },
  muted: {
    fontSize: fonts.sizeSmall,
    color: colors.textMuted,
    margin: 0,
  },
};
