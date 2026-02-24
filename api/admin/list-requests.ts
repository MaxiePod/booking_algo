import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth-middleware.js';
import { db } from '../_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const snapshot = await db.collection('access_requests').orderBy('timestamp', 'desc').get();
  const requests = snapshot.docs.map(doc => doc.data());

  return res.json(requests);
}
