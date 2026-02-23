import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth-middleware';
import { db } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.toLowerCase().trim();

  await db.collection('authorized_users').doc(normalizedEmail).set(
    {
      email: normalizedEmail,
      role: 'user',
      grantedAt: Date.now(),
      grantedBy: admin.email,
    },
    { merge: true }
  );

  // Remove from access_requests if present
  await db.collection('access_requests').doc(normalizedEmail).delete().catch(() => {});

  return res.json({ success: true });
}
