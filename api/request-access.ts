import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { resend } from './_lib/resend.js';

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

    // Notify admins via email
    try {
      const adminsSnapshot = await db.collection('authorized_users')
        .where('role', 'in', ['admin', 'super_admin'])
        .get();
      const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

      if (adminEmails.length > 0) {
        await resend.emails.send({
          from: 'PodPlay <noreply@podplay.club>',
          to: adminEmails,
          subject: `Access request from ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1a1a2e;">New Access Request</h2>
              <p><strong>${name}</strong> (${normalizedEmail}) is requesting access to PodPlay Court Optimizer.</p>
              ${message ? `<p style="color: #6b7280; font-style: italic;">"${message}"</p>` : ''}
              <a href="https://podplay.club" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
                Review in Admin Panel
              </a>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error('Failed to notify admins:', err);
      // Don't fail the request if email fails
    }
  }

  return res.json({ success: true });
}
