import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSuperAdmin } from '../_lib/auth-middleware.js';
import { db } from '../_lib/firebase-admin.js';

const SUPER_ADMIN_EMAIL = 'max@podplay.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireSuperAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden: super admin required' });

  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role required' });

  const normalizedEmail = email.toLowerCase().trim();

  // Cannot change super_admin's role
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Cannot change super admin role' });
  }

  const validRoles = ['user', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const doc = await db.collection('authorized_users').doc(normalizedEmail).get();
  if (!doc.exists) return res.status(404).json({ error: 'User not found' });

  await db.collection('authorized_users').doc(normalizedEmail).update({ role });
  return res.json({ success: true });
}
