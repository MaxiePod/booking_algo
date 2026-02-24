import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth-middleware.js';
import { db } from '../_lib/firebase-admin.js';
import { resend } from '../_lib/resend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const normalizedEmail = email.toLowerCase().trim();

  // Grant access
  await db.collection('authorized_users').doc(normalizedEmail).set(
    {
      email: normalizedEmail,
      role: 'user',
      grantedAt: Date.now(),
      grantedBy: admin.email,
    },
    { merge: true }
  );

  // Send invite email
  try {
    await resend.emails.send({
      from: 'PodPlay <noreply@podplay.club>',
      to: normalizedEmail,
      subject: 'You\'ve been invited to PodPlay Court Optimizer',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">Welcome to PodPlay</h2>
          <p style="color: #374151;">You've been granted access to the PodPlay Court Optimizer.</p>
          <a href="https://podplay.club" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Sign In
          </a>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send invite email:', err);
    // Access was still granted, just email failed
  }

  return res.json({ success: true });
}
