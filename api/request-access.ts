import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const normalizedEmail = email.toLowerCase().trim();

  // Check if already exists
  const existing = await db.collection('access_requests').doc(normalizedEmail).get();
  if (!existing.exists) {
    await db.collection('access_requests').doc(normalizedEmail).set({
      name,
      email: normalizedEmail,
      message: message || '',
      timestamp: Date.now(),
    });
  }

  return res.json({ success: true });
}
