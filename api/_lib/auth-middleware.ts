import type { VercelRequest } from '@vercel/node';
import { adminAuth, db } from './firebase-admin.js';

interface VerifiedUser {
  uid: string;
  email: string;
  role: string;
}

export async function verifyAuthToken(req: VercelRequest): Promise<VerifiedUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email;
    if (!email) return null;
    // Look up role from Firestore
    const doc = await db.collection('authorized_users').doc(email.toLowerCase()).get();
    const role = doc.exists ? (doc.data()?.role ?? 'user') : 'user';
    return { uid: decoded.uid, email, role };
  } catch {
    return null;
  }
}

export async function requireAdmin(req: VercelRequest): Promise<VerifiedUser | null> {
  const user = await verifyAuthToken(req);
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'super_admin') return null;
  return user;
}

export async function requireSuperAdmin(req: VercelRequest): Promise<VerifiedUser | null> {
  const user = await verifyAuthToken(req);
  if (!user) return null;
  if (user.role !== 'super_admin') return null;
  return user;
}
