import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { resend } from './_lib/resend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user is authorized
  const userDoc = await db.collection('authorized_users').doc(normalizedEmail).get();
  const isAuthorized = userDoc.exists;

  if (!isAuthorized) {
    // Still return sent: true so the client knows the request was processed,
    // but isAuthorized: false tells it to show the denied/request-access flow
    return res.json({ sent: true, isAuthorized: false });
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store OTP in Firestore
  await db.collection('otp_codes').doc(normalizedEmail).set({
    code,
    expiresAt,
    attempts: 0,
    used: false,
  });

  // Send via Resend
  try {
    await resend.emails.send({
      from: 'PodPlay <noreply@podplay.club>',
      to: normalizedEmail,
      subject: 'Your PodPlay verification code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">Your verification code</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; padding: 16px 0;">
            ${code}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This code expires in 10 minutes. If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return res.status(500).json({ sent: false, isAuthorized: true });
  }

  return res.json({ sent: true, isAuthorized: true });
}
