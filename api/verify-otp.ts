import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, db } from './_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const normalizedEmail = email.toLowerCase().trim();
  const otpRef = db.collection('otp_codes').doc(normalizedEmail);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    return res.json({ success: false, error: 'No OTP found. Please request a new code.' });
  }

  const otp = otpDoc.data()!;

  if (otp.used) {
    return res.json({ success: false, error: 'Code already used. Please request a new one.' });
  }

  if (Date.now() > otp.expiresAt) {
    return res.json({ success: false, error: 'Code expired. Please request a new one.' });
  }

  if (otp.attempts >= 5) {
    return res.json({ success: false, error: 'Too many attempts. Please request a new code.' });
  }

  // Increment attempts
  await otpRef.update({ attempts: (otp.attempts || 0) + 1 });

  if (otp.code !== code) {
    return res.json({ success: false, error: 'Invalid code.' });
  }

  // Mark as used
  await otpRef.update({ used: true });

  // Look up user role
  const userDoc = await db.collection('authorized_users').doc(normalizedEmail).get();
  if (!userDoc.exists) {
    return res.json({ success: false, error: 'User not authorized.' });
  }

  const userData = userDoc.data()!;
  const role = userData.role || 'user';

  // Create or get Firebase Auth user
  let uid: string;
  try {
    const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
    uid = existingUser.uid;
  } catch {
    // User doesn't exist in Firebase Auth yet — create them
    const newUser = await adminAuth.createUser({ email: normalizedEmail });
    uid = newUser.uid;
  }

  // Generate custom token with role claim
  const customToken = await adminAuth.createCustomToken(uid, { role, email: normalizedEmail });

  const now = Date.now();
  return res.json({
    success: true,
    customToken,
    user: {
      email: normalizedEmail,
      role,
      authorizedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  });
}
