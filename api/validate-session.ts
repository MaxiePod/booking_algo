import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuthToken } from './_lib/auth-middleware';
import { db } from './_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyAuthToken(req);
  if (!user) return res.json({ valid: false });

  // Verify user still in authorized_users
  const doc = await db.collection('authorized_users').doc(user.email.toLowerCase()).get();
  return res.json({ valid: doc.exists });
}
