// server.js — DESKTOPMAT backend
//
// Handles Stripe Checkout session creation and order lookup.
// The Stripe secret key NEVER reaches the browser, and prices sent
// from the client are NEVER trusted — the server always resolves the
// correct Stripe Price ID from stripe-catalog.json, a trusted
// server-side mapping built directly from your Stripe dashboard export
// (28 Product IDs, 140 Price IDs). The client only ever sends a
// productId + size string; the server looks up the real price.
//
// If you add/remove/rename a Stripe product or price, regenerate
// stripe-catalog.json to match — see the note at the bottom of this
// file for the expected shape.

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Stripe = require('stripe');
const crypto = require('crypto');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/Images', express.static(path.join(__dirname, 'Images')));

const catalog = require('./public/products.json');
const stripeCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'stripe-catalog.json'), 'utf8'));

// ---- Shipping config (mirrors frontend copy) ----
const FREE_SHIPPING_THRESHOLD = 75;
const SHIPPING_RATES = {
  standard: { label: 'Standard Shipping (5–7 business days)', amount: 6.99 },
  express: { label: 'Express Shipping (2–3 business days)', amount: 14.99 },
  overnight: { label: 'Overnight Shipping (1 business day)', amount: 29.99 },
};
const TAX_RATE = 0.0; // flat-rate estimated tax, adjust as needed (0–1)
const WELCOME_DISCOUNT_CODE = 'WELCOME10';

async function getWelcomePromotionCode(stripe) {
  const existing = await stripe.promotionCodes.list({ code: WELCOME_DISCOUNT_CODE, active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const coupon = await stripe.coupons.create({ percent_off: 10, duration: 'once', name: WELCOME_DISCOUNT_CODE });
  const promotion = await stripe.promotionCodes.create({ coupon: coupon.id, code: WELCOME_DISCOUNT_CODE });
  return promotion.id;
}

function centsFromDollars(n) {
  return Math.round(n * 100);
}

function normalizePromoCode(code) {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

function getCatalogItem(productId) {
  return catalog.find((p) => p.id === productId);
}

// Resolve a trusted Stripe Price ID for a (productId, dims) pair.
// Returns null if it can't be resolved — caller must reject the request.
function resolvePrice(productId, dims) {
  const entry = stripeCatalog[productId];
  if (!entry) return null;
  const priceId = entry.prices[dims];
  if (!priceId) return null;

  // Also grab the trusted dollar amount from products.json so we can
  // compute order totals (free-shipping threshold, etc.) without ever
  // trusting a client-sent number.
  const catalogItem = getCatalogItem(productId);
  const sizeInfo = catalogItem && catalogItem.sizes.find((s) => s.dims === dims);
  if (!sizeInfo) return null;

  return { priceId, unitAmountCents: centsFromDollars(sizeInfo.price) };
}

// ---- Startup sanity check ----
// Confirms every catalog product/size has a matching Stripe Price ID,
// so a misconfiguration surfaces immediately in the console instead of
// failing silently at checkout time.
function verifyStripeCatalog() {
  let ok = 0;
  let missing = [];
  for (const item of catalog) {
    const entry = stripeCatalog[item.id];
    if (!entry) {
      missing.push(`${item.id}: no entry in stripe-catalog.json`);
      continue;
    }
    for (const size of item.sizes) {
      if (entry.prices[size.dims]) ok++;
      else missing.push(`${item.id}: missing price for ${size.dims}`);
    }
  }
  if (missing.length) {
    console.warn(`[stripe-catalog] ${missing.length} issue(s) found:`);
    missing.forEach((m) => console.warn(`  - ${m}`));
  } else {
    console.log(`[stripe-catalog] OK — all ${catalog.length} products × 5 sizes (${ok} prices) resolved.`);
  }
}

// ---- Routes ----

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    catalogProducts: catalog.length,
    stripeCatalogProducts: Object.keys(stripeCatalog).length,
  });
});

app.post('/create-checkout-session', async (req, res) => {
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
      const qtyNum = Number.isInteger(qty) && qty > 0 ? qty : 1;

      const catalogItem = getCatalogItem(productId);
      if (!catalogItem) {
        return res.status(400).json({ error: `Unknown product: ${productId}` });
      }

      // size arrives as the size "dims" string from the client; it is
      // only ever used to look up the trusted server-side price, never
      // to determine the amount charged.
      const resolved = resolvePrice(productId, size);
      if (!resolved) {
        return res.status(409).json({
          error: `Price for "${catalogItem.name}" (${size}) could not be resolved. Check stripe-catalog.json.`,
        });
      }

      line_items.push({
        price: resolved.priceId,
        quantity: qtyNum,
      });
      subtotalCents += resolved.unitAmountCents * qtyNum;
    }

    // Shipping
    const method = SHIPPING_RATES[shippingMethod] ? shippingMethod : 'standard';
    const subtotalDollars = subtotalCents / 100;
    const freeShipping = subtotalDollars >= FREE_SHIPPING_THRESHOLD;
    const shippingAmount = freeShipping ? 0 : SHIPPING_RATES[method].amount;

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

    // Flat-rate estimated tax as a line item (server-computed, never client-trusted)
    if (TAX_RATE > 0) {
      const taxableCents = subtotalCents + centsFromDollars(shippingAmount);
      const taxCents = Math.round(taxableCents * TAX_RATE);
      if (taxCents > 0) {
        line_items.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Estimated Tax' },
            unit_amount: taxCents,
          },
          quantity: 1,
        });
      }
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const welcomeDiscount = normalizePromoCode(promoCode) === WELCOME_DISCOUNT_CODE;
    const discounts = welcomeDiscount ? [{ promotion_code: await getWelcomePromotionCode(stripe) }] : undefined;
    const trackingNumber = `DM-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${DOMAIN}/?page=confirmation&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/?page=cart`,
      customer_email: contact && contact.email ? contact.email : undefined,
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      discounts,
      metadata: {
        freeShipping: String(freeShipping),
        shippingMethod: method,
        promoCode: welcomeDiscount ? WELCOME_DISCOUNT_CODE : '',
        trackingNumber,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] error:', err);
    res.status(500).json({ error: 'Unable to create checkout session.' });
  }
});

app.get('/order-details', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent'],
    });

    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details ? session.customer_details.email : null,
      amount_total: session.amount_total,
      currency: session.currency,
      tracking_number: session.metadata ? session.metadata.trackingNumber : null,
      shipping: session.shipping_details || null,
      line_items: session.line_items ? session.line_items.data.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        amount_total: li.amount_total,
      })) : [],
    });
  } catch (err) {
    console.error('[order-details] error:', err);
    res.status(500).json({ error: 'Unable to retrieve order details.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

verifyStripeCatalog();
app.listen(PORT, () => {
  console.log(`DESKTOPMAT server running on ${DOMAIN} (port ${PORT})`);
});

// -----------------------------------------------------------------
// stripe-catalog.json shape (trusted, server-side only):
//
// {
//   "<catalog product id, matches products.json 'id'>": {
//     "stripeProductName": "<Stripe product name, informational>",
//     "displayName": "<color name, informational>",
//     "productId": "prod_...",
//     "prices": {
//       "60 × 35 cm": "price_...",
//       "80 × 40 cm": "price_...",
//       "90 × 43 cm": "price_...",
//       "100 × 50 cm": "price_...",
//       "120 × 50 cm": "price_..."
//     }
//   },
//   ...
// }
// -----------------------------------------------------------------
