const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const OWNER_EMAIL = process.env.NEWSLETTER_TO_EMAIL || 'desktopmatinfo@gmail.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM_EMAIL) {
    return res.status(500).json({ error: 'Newsletter email is not configured yet.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };
  const messages = [
    {
      from: process.env.NEWSLETTER_FROM_EMAIL,
      to: [OWNER_EMAIL],
      subject: 'New DESKTOPMAT newsletter signup',
      text: `New subscriber: ${email}`,
    },
    {
      from: process.env.NEWSLETTER_FROM_EMAIL,
      to: [email],
      subject: 'Your DESKTOPMAT welcome code',
      text: 'Thanks for signing up. Use WELCOME10 for 10% off your first order at DESKTOPMAT.',
    },
  ];

  try {
    for (const message of messages) {
      const response = await fetch(RESEND_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(message) });
      if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    }
    return res.status(200).json({ ok: true, code: 'WELCOME10' });
  } catch (error) {
    console.error('[newsletter] error:', error);
    return res.status(502).json({ error: 'Unable to send the newsletter email.' });
  }
};