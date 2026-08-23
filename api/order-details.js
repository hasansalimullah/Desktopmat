const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on Vercel.' });
  }

  const { session_id: sessionId } = req.query || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });
    return res.status(200).json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || null,
      amount_total: session.amount_total,
      currency: session.currency,
      shipping: session.shipping_details || null,
      line_items: session.line_items?.data.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        amount_total: item.amount_total,
      })) || [],
    });
  } catch (error) {
    console.error('[order-details] error:', error);
    return res.status(500).json({ error: 'Unable to retrieve order details.' });
  }
};