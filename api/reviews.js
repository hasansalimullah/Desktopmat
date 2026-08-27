const { kv } = require('@vercel/kv');

// Reviews are stored in Vercel KV under key "reviews:<productId>" as an array.
// GET  /api/reviews?productId=black        -> { reviews: [...] }
// GET  /api/reviews?home=1                 -> { reviews: [...] }  (recent, across all products, for the homepage)
// POST /api/reviews  { productId, name, rating, comment, image, productName }

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { productId, home } = req.query;

    if (home) {
      const keys = await kv.keys('reviews:*');
      const all = [];
      for (const key of keys) {
        const list = (await kv.get(key)) || [];
        all.push(...list);
      }
      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.status(200).json({ reviews: all.slice(0, 6) });
    }

    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    const reviews = (await kv.get(`reviews:${productId}`)) || [];
    return res.status(200).json({ reviews });
  }

  if (req.method === 'POST') {
    const { productId, name, rating, comment, image, productName } = req.body || {};
    if (!productId || !name || !comment) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Please choose a star rating.' });
    }
    if (image && (typeof image !== 'string' || image.length > 2_000_000)) {
      return res.status(400).json({ error: 'Image too large.' });
    }

    const review = {
      name: String(name).trim().slice(0, 60),
      rating: ratingNum,
      comment: String(comment).trim().slice(0, 600),
      image: typeof image === 'string' ? image : '',
      productName: productName ? String(productName).slice(0, 80) : productId,
      date: new Date().toISOString(),
    };

    const key = `reviews:${productId}`;
    const existing = (await kv.get(key)) || [];
    existing.unshift(review);
    await kv.set(key, existing.slice(0, 200)); // cap stored reviews per product

    return res.status(200).json({ ok: true, review });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};