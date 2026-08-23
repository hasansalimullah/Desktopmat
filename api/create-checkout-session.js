const Stripe = require('stripe');
const crypto = require('crypto');

const catalog = require('../public/products.json');
const stripeCatalog = require('../stripe-catalog.json');

const SHIPPING_RATES = {
  standard: { label: 'Standard Shipping (5–7 business days)', amount: 6.99 },
  express: { label: 'Express Shipping (2–3 business days)', amount: 14.99 },
  overnight: { label: 'Overnight Shipping (1 business day)', amount: 29.99 },
};
const FREE_SHIPPING_THRESHOLD = 75;
const WELCOME_DISCOUNT_CODE = 'WELCOME10';

async function getWelcomePromotionCode(stripe) {
  const existing = await stripe.promotionCodes.list({ code: WELCOME_DISCOUNT_CODE, active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const coupon = await stripe.coupons.create({ percent_off: 10, duration: 'once', name: WELCOME_DISCOUNT_CODE });
  const promotion = await stripe.promotionCodes.create({ coupon: coupon.id, code: WELCOME_DISCOUNT_CODE });
  return promotion.id;
}

function centsFromDollars(amount) {
  return Math.round(amount * 100);
}

function normalizePromoCode(code) {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

function resolvePrice(productId, dims) {
  const catalogItem = catalog.find((item) => item.id === productId);
  const priceId = stripeCatalog[productId]?.prices?.[dims];
  const sizeInfo = catalogItem?.sizes.find((size) => size.dims === dims);
  if (!catalogItem || !priceId || !sizeInfo) return null;
  return { priceId, unitAmountCents: centsFromDollars(sizeInfo.price) };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on Vercel.' });
  }

  try {
    const { items, shippingMethod, promoCode, contact } = req.body || {};
    if (shippingMethod && shippingMethod !== 'standard') {
      return res.status(400).json({ error: 'This shipping method is coming soon.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const line_items = [];
    let subtotalCents = 0;
    for (const raw of items) {
      const { productId, size, qty } = raw || {};
      const catalogItem = catalog.find((item) => item.id === productId);
      if (!catalogItem) return res.status(400).json({ error: `Unknown product: ${productId}` });
      const resolved = resolvePrice(productId, size);
      if (!resolved) return res.status(409).json({ error: `Price for "${catalogItem.name}" (${size}) could not be resolved.` });
      const quantity = Number.isInteger(qty) && qty > 0 ? qty : 1;
      line_items.push({ price: resolved.priceId, quantity });
      subtotalCents += resolved.unitAmountCents * quantity;
    }

    const method = SHIPPING_RATES[shippingMethod] ? shippingMethod : 'standard';
    const shippingAmount = subtotalCents / 100 >= FREE_SHIPPING_THRESHOLD
      ? 0 : SHIPPING_RATES[method].amount;
    if (shippingAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: SHIPPING_RATES[method].label },
          unit_amount: centsFromDollars(shippingAmount),
        },
        quantity: 1,
      });
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const domain = process.env.DOMAIN || `https://${req.headers.host}`;
    const trackingNumber = `DM-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const welcomeDiscount = normalizePromoCode(promoCode) === WELCOME_DISCOUNT_CODE;
    const discounts = welcomeDiscount ? [{ promotion_code: await getWelcomePromotionCode(stripe) }] : undefined;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${domain}/?page=confirmation&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/?page=cart`,
      customer_email: contact?.email || undefined,
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      discounts,
      metadata: { freeShipping: String(shippingAmount === 0), shippingMethod: method, promoCode: welcomeDiscount ? WELCOME_DISCOUNT_CODE : '', trackingNumber },
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[checkout] error:', error);
    return res.status(500).json({ error: 'Unable to create checkout session.' });
  }
};