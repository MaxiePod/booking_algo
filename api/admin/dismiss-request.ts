import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth-middleware.js';
import { db } from '../_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  await db.collection('access_requests').doc(email.toLowerCase().trim()).delete();
  return res.json({ success: true });
}
