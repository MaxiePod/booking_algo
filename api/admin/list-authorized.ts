import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth-middleware.js';
import { db } from '../_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const snapshot = await db.collection('authorized_users').get();
  const now = Date.now();
  const users = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      email: data.email || doc.id,
      role: data.role || 'user',
      authorizedAt: data.grantedAt || now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    };
  });

  return res.json(users);
}
