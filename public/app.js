// app.js — DESKTOPMAT frontend
// Plain vanilla JS SPA. All routing goes through go(page, param).

let PRODUCTS = [];
let cart = []; // { productId, size, qty }  -- no localStorage, intentional
let shopState = { sizeFilter: 'all', search: '', sort: 'featured' };
let checkoutState = {
  contact: { email: '' },
  address: { firstName: '', lastName: '', street: '', city: '', state: '', zip: '', country: 'US' },
  shippingMethod: 'standard',
  promoCode: '',
  saveInfo: false,
};
const SAVED_INFO_KEY = 'desktopmat_checkout_info';
const NEWSLETTER_SIGNUP_KEY = 'desktopmat_newsletter_signup';
const NEWSLETTER_DISMISSED_KEY = 'desktopmat_newsletter_dismissed';

const METALLIC_PRODUCT_IDS = new Set(['bronze', 'silver']);
const FREE_SHIPPING_CODE = 'ONLYIKNOW';
const WELCOME_DISCOUNT_CODE = 'WELCOME10';
const DEFAULT_MAT_IMAGES = [
  '/Images/Default%20Mat/mat%20(4).png',
  '/Images/Default%20Mat/mat%20(2).png',
  '/Images/Default%20Mat/mat%20(3).png',
];
const COLOR_IMAGE_FILES = {
  'light-purple': 'Light_purple.jpeg', 'pale-mauve': 'plae mauve.jpeg', pink: 'pink.jpeg',
  'light-pink': 'light pink.jpeg', 'grayish-lavender': 'grayish lavender.jpeg', chocolate: 'chocolate.jpeg',
  brown: 'brown.jpeg', bronze: 'bronze.jpeg', khaki: 'khaki.jpeg', latte: 'latte.jpeg',
  eggshell: 'eggshell.jpeg', cream: 'cream.jpeg', 'dark-blue': 'dark blue.jpeg', 'ice-blue': 'ice blue.jpeg',
  'baby-blue': 'baby blue.jpeg', 'dark-green': 'dark green.jpeg', 'jade-green': 'jade green.jpeg',
  green: 'green.jpeg', 'peak-green': 'peak green.jpeg', 'pale-green': 'plae green.jpeg',
  'sage-green': 'sage green.jpeg', 'grayish-green': 'grayish green.jpeg', gray: 'gray.jpeg',
  'light-gray': 'light gray.jpeg', silver: 'sliver.jpeg', white: 'white.jpeg', black: 'black.jpeg',
  'dark-gray': 'dark gray.jpeg',
};

const app = document.getElementById('app');

// ---------- Data ----------
async function loadProducts() {
  if (PRODUCTS.length) return PRODUCTS;
  try {
    const res = await fetch('./products.json');
    if (!res.ok) throw new Error(`products.json request failed (${res.status})`);
    PRODUCTS = await res.json();
    return PRODUCTS;
  } catch (err) {
    console.error('[DESKTOPMAT] Failed to load products.json:', err);
    app.innerHTML = `
      <div class="empty-state">
        <h2>Couldn't load the catalog</h2>
        <p>products.json failed to load (${err.message}). If you're using VS Code Live Server, make sure it's serving the <code>public</code> folder as its root, or open <code>public/index.html</code> directly. For full functionality (cart, checkout), run <code>npm start</code> and visit <code>http://localhost:3000</code> instead.</p>
      </div>
    `;
    throw err;
  }
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function fmt(n) {
  return `$${n.toFixed(2)}`;
}

function startingPrice(product) {
  return Math.min(...product.sizes.map((s) => s.price));
}

function storefrontProducts() {
  const colored = PRODUCTS.filter((p) => !METALLIC_PRODUCT_IDS.has(p.id));
  const testing = PRODUCTS.find((p) => p.id === 'testing');
  return [{
    ...colored[0],
    id: 'colored-mat',
    name: 'Colored Desk Mat',
    image: DEFAULT_MAT_IMAGES[0],
    tagline: 'One mat, 26 finishes, five sizes.',
    desc: 'The DESKTOPMAT in the finish you choose. A smooth, low-friction surface with stitched edges and a non-slip base for everyday typing, mousing, and writing.',
    variants: colored,
    gallery: DEFAULT_MAT_IMAGES,
  }, ...(testing ? [{ ...testing, tag: 'TEST' }] : []), ...PRODUCTS.filter((p) => METALLIC_PRODUCT_IDS.has(p.id))];
}

function productImage(product) {
  const file = COLOR_IMAGE_FILES[product.id];
  return file ? `/Images/Colored%20Mat/${encodeURIComponent(file)}` : '';
}

// ---------- Mat pattern placeholder (used when no real image is set) ----------
function matPatternStyle(product) {
  const c = product.color || '#CCCCCC';
  return `background: linear-gradient(160deg, ${c} 0%, ${shade(c, -10)} 100%);`;
}
function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00FF) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000FF) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
function matVisual(product, extraStyle = '') {
  const image = product.image || productImage(product);
  if (image) return `<img src="${image}" alt="${product.name}" />`;
  return `<div class="mat-pattern" style="${matPatternStyle(product)}${extraStyle}"></div>`;
}

// ---------- Router ----------
async function go(page, param) {
  await loadProducts();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  toggleCart(false);
  toggleMobileNav(false);

  switch (page) {
    case 'home': return renderHome();
    case 'shop': return renderShop();
    case 'product': return renderProduct(param);
    case 'cart': return renderCartPage();
    case 'checkout': return renderCheckout();
    case 'info': return renderInfoPage(param);
    case 'confirmation': return renderConfirmation(param);
    default: return renderHome();
  }
}
window.go = go;

// ---------- Home ----------
function renderHome() {
  const featured = storefrontProducts();
  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>A calmer desk starts with the surface.</h1>
        <p>Precision-cut desk mats in 26 colors and 5 sizes. Smooth glide, stitched edges, zero clutter.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="go('shop')">Shop all colors</button>
          <button class="btn btn-outline" onclick="go('shop')">Browse sizes</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Bestsellers</h2>
        <button class="see-all" onclick="go('shop')">See all →</button>
      </div>
      <div class="grid">
        ${featured.map(cardHTML).join('')}
      </div>
    </section>

    <section class="newsletter-section">
      <div>
        <span class="eyebrow">DESKTOPMAT NOTES</span>
        <h2>Join the DESKTOPMAT list.</h2>
        <p>New colors, desk setups, and occasional offers.</p>
      </div>
      <form id="newsletter-form" onsubmit="signUpNewsletter(event)">
        <input id="newsletter-email" type="email" autocomplete="email" placeholder="Email address" required />
        <button class="btn btn-black" type="submit">Join newsletter</button>
      </form>
    </section>
  `;
}

function renderInfoPage(page) {
  const pages = {
    contact: ['Contact', ['Need help with an order, product question, or checkout issue? Email desktopmatinfo@gmail.com and include your order reference when one is available. We read every message and use the details you provide only to help with your request.', 'For questions about colors, sizes, shipping estimates, or returns, tell us what you were looking at and what you need. A clear subject and a short description help us respond more quickly.', 'We aim to reply within two business days. Please do not email payment card numbers, passwords, or secret API keys.']],
    shipping: ['Shipping', ['Every order is prepared after checkout and shipped to the address entered during payment. Available shipping methods, prices, and estimated delivery windows appear before you confirm the order.', 'Standard shipping is currently available. Express and overnight shipping are coming soon. Orders that qualify for free shipping will show the shipping charge as free before you continue to Stripe Checkout.', 'After an order is placed, keep the order reference shown on the confirmation page. It helps us locate your purchase if you need support. Carrier tracking details are provided separately once a package has actually shipped.']],
    returns: ['Returns', ['We want your desk setup to feel right. If you need to request a return, email desktopmatinfo@gmail.com with your order reference, the item you want to return, and a brief explanation of the issue.', 'Please contact us before mailing anything back so we can confirm the correct return instructions. Items should be unused and protected during transit whenever possible. Return eligibility can depend on the condition of the product and the timing of the request.', 'Once an approved return is received and checked, we will explain the next step for the refund or replacement. Original shipping charges may not be refundable unless the item arrived damaged or there was an error with the order.']],
    about: ['About DESKTOPMAT', ['DESKTOPMAT makes desk mats for people who care about the surface beneath their work. The goal is simple: a smooth, stable place for a keyboard, mouse, notebook, and the small rituals that make focused work easier.', 'The collection is intentionally restrained. Instead of overwhelming you with features, we focus on useful sizes, calm colors, stitched edges, and a low-friction surface that works through long sessions at a desk.', 'We are building the store carefully, one improvement at a time. That includes clearer product information, dependable checkout behavior, and support that treats every order as more than a transaction.']],
    sustainability: ['Sustainability', ['We try to keep the product line focused so materials, packaging, and fulfillment decisions stay understandable. A smaller, considered collection is easier to manage than a constant cycle of unnecessary variations.', 'Packaging is kept as simple as practical while still protecting the mat during transit. We are also working toward clearer information about materials and fulfillment so customers can make decisions with useful context rather than vague promises.', 'Sustainability is ongoing work, not a label we consider finished. As the store grows, we will continue looking for ways to reduce excess packaging, avoid avoidable waste, and make improvements that hold up beyond the product page.']],
  };
  const [title, paragraphs] = pages[page] || pages.about;
  app.innerHTML = `<section class="info-page"><span class="eyebrow">DESKTOPMAT</span><h1>${title}</h1>${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}<button class="btn btn-primary" onclick="go('shop')">Shop all colors</button></section>`;
}

function cardHTML(product) {
  return `
    <div class="card" onclick="go('product','${product.id}')">
      <div class="card-img-wrap">${matVisual(product)}</div>
      <div class="card-body">
        ${product.tag ? `<span class="badge">${product.tag}</span>` : ''}
        <div class="card-name">${product.name}</div>
        <div class="card-tagline">${product.tagline}</div>
        <div class="card-meta">
          <div class="swatch-row">
            <span class="swatch-dot" style="background:${product.color}"></span>
          </div>
          <div class="card-price">From ${fmt(startingPrice(product))}</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- Shop ----------
function renderShop() {
  const products = storefrontProducts();
  app.innerHTML = `
    <div style="margin:40px 0 24px;">
      <h1 style="font-size:28px;">Shop all colors</h1>
      <p style="color:var(--text-muted);margin-top:6px;">${products.length} products · 5 sizes each</p>
    </div>
    <div class="toolbar">
      <div class="toolbar-left" id="size-chips"></div>
      <div style="display:flex;gap:10px;">
        <input class="search-input" id="shop-search" placeholder="Search colors..." value="${shopState.search}" oninput="onShopSearch(this.value)" />
        <select class="sort-select" id="shop-sort" onchange="onShopSort(this.value)">
          <option value="featured" ${shopState.sort === 'featured' ? 'selected' : ''}>Featured</option>
          <option value="price-asc" ${shopState.sort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-desc" ${shopState.sort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
          <option value="name-asc" ${shopState.sort === 'name-asc' ? 'selected' : ''}>Name: A–Z</option>
        </select>
      </div>
    </div>
    <div class="grid" id="shop-grid"></div>
  `;

  const sizeOptions = ['all', ...new Set(products[0].sizes.map((s) => s.dims))];
  document.getElementById('size-chips').innerHTML = sizeOptions.map((s) => `
    <button class="chip ${shopState.sizeFilter === s ? 'active' : ''}" onclick="onShopSizeFilter('${s}')">
      ${s === 'all' ? 'All sizes' : s}
    </button>
  `).join('');

  renderShopGrid();
}

function onShopSizeFilter(val) { shopState.sizeFilter = val; renderShop(); }
function onShopSearch(val) { shopState.search = val; renderShopGrid(); }
function onShopSort(val) { shopState.sort = val; renderShopGrid(); }
window.onShopSizeFilter = onShopSizeFilter;
window.onShopSearch = onShopSearch;
window.onShopSort = onShopSort;

function renderShopGrid() {
  let list = [...storefrontProducts()];

  if (shopState.search.trim()) {
    const q = shopState.search.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)
      || (p.variants && p.variants.some((variant) => variant.name.toLowerCase().includes(q))));
  }
  if (shopState.sizeFilter !== 'all') {
    list = list.filter((p) => p.sizes.some((s) => s.dims === shopState.sizeFilter));
  }
  if (shopState.sort === 'price-asc') list.sort((a, b) => startingPrice(a) - startingPrice(b));
  if (shopState.sort === 'price-desc') list.sort((a, b) => startingPrice(b) - startingPrice(a));
  if (shopState.sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));

  const grid = document.getElementById('shop-grid');
  grid.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="empty-state" style="grid-column:1/-1;"><h2>No colors found</h2><p>Try a different search or filter.</p></div>`;
}

function openSearch() {
  go('shop');
  setTimeout(() => document.getElementById('shop-search')?.focus(), 50);
}
window.openSearch = openSearch;

// ---------- Product detail ----------
let pdpState = { size: null, qty: 1, variantId: null };

function renderProduct(id) {
  const product = id === 'colored-mat' ? storefrontProducts()[0] : findProduct(id);
  if (!product) { app.innerHTML = `<div class="empty-state"><h2>Product not found</h2></div>`; return; }
  const selectedVariant = product.variants
    ? (product.variants.find((variant) => variant.id === pdpState.variantId) || product.variants[0])
    : product;
  pdpState = { size: selectedVariant.sizes[0].dims, qty: 1, variantId: selectedVariant.id };

  app.innerHTML = `
    <div class="pdp">
      <div>
        <div class="pdp-img-wrap" id="pdp-gallery-main">${product.gallery ? `<img src="${product.gallery[0]}" alt="${product.name} detail view" />` : matVisual(selectedVariant)}</div>
        ${product.gallery ? `<div class="pdp-gallery-thumbs">${product.gallery.map((image, index) => `<button class="pdp-gallery-thumb ${index === 0 ? 'selected' : ''}" onclick="selectGalleryImage('${image}', this)"><img src="${image}" alt="${product.name} detail view ${index + 1}" /></button>`).join('')}<button class="pdp-gallery-thumb" onclick="selectGalleryImage('${productImage(selectedVariant)}', this)">${matVisual(selectedVariant)}</button></div>` : ''}
      </div>
      <div>
        <h1 class="pdp-title">${product.name}</h1>
        <div class="pdp-price" id="pdp-price">${fmt(selectedVariant.sizes[0].price)}</div>
        <div class="pdp-tagline">${product.tagline}</div>

        ${product.variants ? `<div class="pdp-label">Color: <span id="pdp-color-label">${selectedVariant.name}</span></div><div class="color-grid">${product.variants.map((variant) => `<button class="color-swatch ${variant.id === selectedVariant.id ? 'selected' : ''}" title="${variant.name}" aria-label="${variant.name}" style="background:${variant.color}" onclick="selectColor('${variant.id}')"></button>`).join('')}</div>` : ''}

        <div class="pdp-label">Size: <span id="pdp-size-label">${selectedVariant.sizes[0].dims}</span></div>
        <div class="size-row">
          ${selectedVariant.sizes.map((s, i) => `
            <button class="size-swatch ${i === 0 ? 'selected' : ''}" data-dims="${s.dims}" onclick="selectSize('${product.id}','${s.dims}')">
              ${s.dims.split(' ')[0]}
            </button>
          `).join('')}
        </div>

        <div class="qty-stepper">
          <button onclick="stepQty(-1)">−</button>
          <span id="pdp-qty">1</span>
          <button onclick="stepQty(1)">+</button>
        </div>

        <button class="btn btn-black btn-full btn-uppercase" onclick="addToCart('${product.id}')">Add to bag</button>
        <button class="btn-plain-link" onclick="buyNow('${product.id}')">or buy it now →</button>

        <p class="pdp-desc">${product.desc}</p>
      </div>
    </div>
  `;
}

function selectGalleryImage(image, button) {
  document.getElementById('pdp-gallery-main').innerHTML = `<img src="${image}" alt="Mat detail view" />`;
  document.querySelectorAll('.pdp-gallery-thumb').forEach((element) => element.classList.remove('selected'));
  button.classList.add('selected');
}
window.selectGalleryImage = selectGalleryImage;

function selectColor(variantId) {
  const variant = findProduct(variantId);
  if (!variant) return;
  pdpState.variantId = variantId;
  pdpState.size = variant.sizes[0].dims;
  document.getElementById('pdp-color-label').textContent = variant.name;
  document.getElementById('pdp-price').textContent = fmt(variant.sizes[0].price);
  document.querySelectorAll('.color-swatch').forEach((element) => {
    element.classList.toggle('selected', element.getAttribute('aria-label') === variant.name);
  });
  const colorThumb = document.querySelector('.pdp-gallery-thumb:last-child');
  colorThumb.innerHTML = matVisual(variant);
  document.getElementById('pdp-gallery-main').innerHTML = matVisual(variant);
  document.querySelectorAll('.pdp-gallery-thumb').forEach((element) => element.classList.remove('selected'));
  colorThumb.classList.add('selected');
  document.querySelectorAll('.size-swatch').forEach((element, index) => element.classList.toggle('selected', index === 0));
  document.getElementById('pdp-size-label').textContent = variant.sizes[0].dims;
}
window.selectColor = selectColor;

function selectSize(productId, dims) {
  const product = productId === 'colored-mat' ? findProduct(pdpState.variantId) : findProduct(productId);
  const size = product.sizes.find((s) => s.dims === dims);
  pdpState.size = dims;
  document.querySelectorAll('.size-swatch').forEach((el) => {
    el.classList.toggle('selected', el.dataset.dims === dims);
  });
  document.getElementById('pdp-size-label').textContent = dims;
  document.getElementById('pdp-price').textContent = fmt(size.price);
}
window.selectSize = selectSize;

function stepQty(delta) {
  pdpState.qty = Math.max(1, pdpState.qty + delta);
  document.getElementById('pdp-qty').textContent = pdpState.qty;
}
window.stepQty = stepQty;

function addToCart(productId, silent) {
  if (productId === 'colored-mat') productId = pdpState.variantId;
  const existing = cart.find((c) => c.productId === productId && c.size === pdpState.size);
  if (existing) existing.qty += pdpState.qty;
  else cart.push({ productId, size: pdpState.size, qty: pdpState.qty });
  updateCartBadge();
  if (!silent) toggleCart(true);
}
window.addToCart = addToCart;

function buyNow(productId) {
  addToCart(productId, true);
  go('checkout');
}
window.buyNow = buyNow;

// ---------- Cart drawer ----------
function cartLines() {
  return cart.map((c) => {
    const product = findProduct(c.productId);
    const size = product.sizes.find((s) => s.dims === c.size);
    return { ...c, product, size };
  }).filter((l) => l.product && l.size);
}

function cartSubtotal() {
  return cartLines().reduce((sum, l) => sum + l.size.price * l.qty, 0);
}

function promoFreeShippingEligible() {
  return cartLines().length > 0
    && cartLines().every((line) => line.product.id === 'testing')
    && checkoutState.promoCode.replace(/\s+/g, '').toUpperCase() === FREE_SHIPPING_CODE;
}

function loadSavedCheckoutInfo() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_INFO_KEY));
    if (!saved) return;
    checkoutState.contact = { ...checkoutState.contact, ...saved.contact };
    checkoutState.address = { ...checkoutState.address, ...saved.address };
    checkoutState.saveInfo = true;
  } catch {
    localStorage.removeItem(SAVED_INFO_KEY);
  }
}

function saveCheckoutInfo() {
  if (checkoutState.saveInfo) {
    localStorage.setItem(SAVED_INFO_KEY, JSON.stringify({ contact: checkoutState.contact, address: checkoutState.address }));
  } else {
    localStorage.removeItem(SAVED_INFO_KEY);
  }
}

function normalizePromoCode(code) {
  return String(code || '').replace(/\s+/g, '').toUpperCase();
}

function discountPercent() {
  return normalizePromoCode(checkoutState.promoCode) === WELCOME_DISCOUNT_CODE ? 10 : 0;
}

async function signUpNewsletter(event) {
  event.preventDefault();
  const email = event.currentTarget.querySelector('input[type="email"]').value.trim().toLowerCase();
  if (!email) return;
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/newsletter-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Signup failed');
    localStorage.setItem(NEWSLETTER_SIGNUP_KEY, email);
    localStorage.setItem('desktopmat_welcome_code', WELCOME_DISCOUNT_CODE);
    form.innerHTML = '<p>Thanks. Check your email for <strong>WELCOME10</strong>.</p>';
    document.getElementById('newsletter-modal-root').innerHTML = '';
  } catch (error) {
    button.disabled = false;
    alert(error.message);
  }
}
window.signUpNewsletter = signUpNewsletter;

function showNewsletterModal() {
  if (localStorage.getItem(NEWSLETTER_SIGNUP_KEY) || localStorage.getItem(NEWSLETTER_DISMISSED_KEY)) return;
  document.getElementById('newsletter-modal-root').innerHTML = '<div class="newsletter-modal-backdrop" onclick="dismissNewsletter(event)"><section class="newsletter-modal" onclick="event.stopPropagation()"><button class="newsletter-close" aria-label="Close" onclick="dismissNewsletter()">×</button><span class="eyebrow">A SMALL WELCOME</span><h2>Join the DESKTOPMAT list.</h2><p>Sign up for occasional DESKTOPMAT notes. Subscribers receive a welcome offer by email.</p><form id="newsletter-modal-form" onsubmit="signUpNewsletter(event)"><input id="newsletter-modal-email" type="email" autocomplete="email" placeholder="Email address" required /><button class="btn btn-black" type="submit">Join newsletter</button></form></section></div>';
}
function dismissNewsletter(event) {
  if (event && event.target !== event.currentTarget) return;
  localStorage.setItem(NEWSLETTER_DISMISSED_KEY, '1');
  document.getElementById('newsletter-modal-root').innerHTML = '';
  document.getElementById('newsletter-reopen').hidden = false;
}
window.dismissNewsletter = dismissNewsletter;

function reopenNewsletter() {
  localStorage.removeItem(NEWSLETTER_DISMISSED_KEY);
  document.getElementById('newsletter-reopen').hidden = true;
  showNewsletterModal();
}
window.reopenNewsletter = reopenNewsletter;

function updateCartBadge() {
  const count = cart.reduce((n, c) => n + c.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function toggleCart(open) {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (open) renderCartDrawer();
  overlay.classList.toggle('open', open);
  drawer.classList.toggle('open', open);
}
window.toggleCart = toggleCart;

function renderCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const lines = cartLines();

  if (!lines.length) {
    drawer.innerHTML = `
      <div class="cd-head"><h3>Your Bag</h3><button onclick="toggleCart(false)">✕</button></div>
      <div class="cd-empty">Your bag is empty.<br><button class="btn btn-outline" style="margin-top:16px;" onclick="toggleCart(false);go('shop')">Continue shopping</button></div>
    `;
    return;
  }

  drawer.innerHTML = `
    <div class="cd-head"><h3>Your Bag (${cart.reduce((n, c) => n + c.qty, 0)})</h3><button onclick="toggleCart(false)">✕</button></div>
    <div class="cd-items">
      ${lines.map((l, i) => `
        <div class="cd-item">
          <div class="cd-item-img">${matVisual(l.product)}</div>
          <div class="cd-item-info">
            <div class="cd-item-name">${l.product.name}</div>
            <div class="cd-item-size">${l.size.dims}</div>
            <div class="cd-item-row">
              <div class="qty-stepper" style="margin:0;">
                <button onclick="changeLineQty(${i},-1)">−</button>
                <span>${l.qty}</span>
                <button onclick="changeLineQty(${i},1)">+</button>
              </div>
              <span style="font-family:var(--font-mono);font-size:13px;">${fmt(l.size.price * l.qty)}</span>
            </div>
            <button style="font-size:12px;color:var(--text-muted);margin-top:6px;" onclick="removeLine(${i})">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="cd-foot">
      <div class="cd-subtotal"><span>Subtotal</span><span>${fmt(cartSubtotal())}</span></div>
      <button class="btn btn-black btn-full btn-uppercase" onclick="toggleCart(false);go('checkout')">Checkout</button>
      <button class="btn-plain-link" onclick="toggleCart(false);go('cart')">View full bag</button>
    </div>
  `;
}

function changeLineQty(index, delta) {
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  updateCartBadge();
  renderCartDrawer();
  if (document.querySelector('.cart-page')) renderCartPage();
}
window.changeLineQty = changeLineQty;

function removeLine(index) {
  cart.splice(index, 1);
  updateCartBadge();
  renderCartDrawer();
  if (document.querySelector('.cart-page')) renderCartPage();
}
window.removeLine = removeLine;

// ---------- Full cart page ----------
function renderCartPage() {
  const lines = cartLines();
  const subtotal = cartSubtotal();
  const freeShip = subtotal >= 75;

  if (!lines.length) {
    app.innerHTML = `<div class="empty-state"><h2>Your bag is empty</h2><p>Find a color you like.</p><button class="btn btn-primary" style="margin-top:20px;" onclick="go('shop')">Shop all colors</button></div>`;
    return;
  }

  app.innerHTML = `
    <h1 style="margin:40px 0 24px;font-size:28px;">Your Bag</h1>
    <div class="cart-page">
      <div>
        ${lines.map((l, i) => `
          <div class="cd-item" style="align-items:center;">
            <div class="cd-item-img" style="width:90px;height:90px;">${matVisual(l.product)}</div>
            <div class="cd-item-info">
              <div class="cd-item-name" style="font-size:16px;">${l.product.name}</div>
              <div class="cd-item-size">${l.size.dims}</div>
              <div class="cd-item-row">
                <div class="qty-stepper" style="margin:0;">
                  <button onclick="changeLineQty(${i},-1)">−</button>
                  <span>${l.qty}</span>
                  <button onclick="changeLineQty(${i},1)">+</button>
                </div>
                <span style="font-family:var(--font-mono);font-size:15px;">${fmt(l.size.price * l.qty)}</span>
              </div>
              <button style="font-size:12px;color:var(--text-muted);margin-top:6px;" onclick="removeLine(${i})">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="summary-panel">
        <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        <div class="row"><span>Shipping</span><span>${freeShip ? 'Free' : 'Calculated at checkout'}</span></div>
        ${!freeShip ? `<div class="row" style="color:var(--accent-tint);font-size:12px;">Free shipping over $75 — add ${fmt(75 - subtotal)} more</div>` : ''}
        <div class="row total"><span>Total</span><span>${fmt(subtotal)}</span></div>
        <button class="btn btn-primary btn-full btn-uppercase" style="margin-top:16px;" onclick="go('checkout')">Proceed to checkout</button>
      </div>
    </div>
  `;
}

// ---------- Checkout ----------
function renderCheckout() {
  const lines = cartLines();
  if (!lines.length) { go('cart'); return; }
  if (checkoutState.shippingMethod !== 'standard') checkoutState.shippingMethod = 'standard';
  const subtotal = cartSubtotal();
  const freeShip = subtotal >= 75 || promoFreeShippingEligible();
  const discount = discountPercent();

  const rates = {
    standard: { label: 'Standard', sub: '5–7 business days', price: 6.99, available: true },
    express: { label: 'Express', sub: '2–3 business days', price: 14.99, available: false },
    overnight: { label: 'Overnight', sub: '1 business day', price: 29.99, available: false },
  };
  const shipCost = freeShip ? 0 : rates[checkoutState.shippingMethod].price;
  const total = subtotal * (1 - discount / 100) + shipCost;

  app.innerHTML = `
    <h1 style="margin:40px 0 24px;font-size:28px;">Checkout</h1>
    <div class="cart-page">
      <form class="checkout-form" id="checkout-form" autocomplete="on" onsubmit="submitCheckout(event)">
        <div class="form-section">
          <h3>Contact</h3>
          <div class="field"><label>Email</label><input type="email" name="email" autocomplete="email" required id="cf-email" value="${checkoutState.contact.email}" placeholder="you@example.com" /></div>
        </div>

        <div class="form-section" autocomplete="shipping">
          <h3>Shipping address</h3>
          <div class="form-grid">
            <div class="field"><label>First name</label><input name="given-name" autocomplete="shipping given-name" required id="cf-first" value="${checkoutState.address.firstName}" /></div>
            <div class="field"><label>Last name</label><input name="family-name" autocomplete="shipping family-name" required id="cf-last" value="${checkoutState.address.lastName}" /></div>
            <div class="field full"><label>Street address</label><input name="street-address" autocomplete="shipping street-address" required id="cf-street" value="${checkoutState.address.street}" /></div>
            <div class="field"><label>City</label><input name="address-level2" autocomplete="shipping address-level2" required id="cf-city" value="${checkoutState.address.city}" /></div>
            <div class="field"><label>State</label><input name="address-level1" autocomplete="shipping address-level1" required id="cf-state" value="${checkoutState.address.state}" /></div>
            <div class="field"><label>ZIP code</label><input name="postal-code" autocomplete="shipping postal-code" required id="cf-zip" value="${checkoutState.address.zip}" /></div>
            <div class="field">
              <label>Country</label>
              <select name="country" autocomplete="shipping country" id="cf-country">
                <option value="US" ${checkoutState.address.country === 'US' ? 'selected' : ''}>United States</option>
                <option value="CA" ${checkoutState.address.country === 'CA' ? 'selected' : ''}>Canada</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Shipping method</h3>
          ${Object.entries(rates).map(([key, r]) => `
            <div class="ship-option ${checkoutState.shippingMethod === key ? 'selected' : ''}${r.available ? '' : ' disabled'}" ${r.available ? `onclick="selectShipping('${key}')"` : 'aria-disabled="true"'}>
              <div>
                <div class="ship-option-label">${r.label}</div>
                <div class="ship-option-sub">${r.sub}</div>
              </div>
              <div class="ship-option-price">${r.available ? (freeShip ? 'Free' : fmt(r.price)) : 'COMING SOON'}</div>
            </div>
          `).join('')}
        </div>

        <div class="form-section">
          <label style="display:flex;gap:8px;align-items:center;font-size:13px;"><input type="checkbox" id="save-info" ${checkoutState.saveInfo ? 'checked' : ''} /> Save my contact and shipping info for future orders</label>
        </div>

        <div class="form-section">
          <h3>Payment</h3>
          <p style="font-size:13px;color:var(--text-muted);">You'll enter payment details securely on the next screen via Stripe Checkout.</p>
        </div>

        <button class="btn btn-black btn-full btn-uppercase" type="submit" id="checkout-submit">Continue to payment</button>
      </form>

      <div class="summary-panel">
        <h3 style="font-size:14px;margin-bottom:14px;">Order summary</h3>
        ${lines.map((l) => `
          <div class="row"><span>${l.product.name} · ${l.size.dims} × ${l.qty}</span><span>${fmt(l.size.price * l.qty)}</span></div>
        `).join('')}
        <div class="row"><span>Shipping</span><span id="checkout-shipping-cost">${freeShip ? 'Free' : fmt(shipCost)}</span></div>
        <div class="row" id="checkout-discount-row" style="${discountPercent() ? '' : 'display:none;'}"><span>WELCOME10</span><span>-${fmt(subtotal * discountPercent() / 100)}</span></div>
        <div class="promo-row">
          <input placeholder="Promo code" id="promo-input" value="${checkoutState.promoCode}" />
          <button type="button" onclick="applyPromo()">Apply</button>
        </div>
        <div class="row total"><span>Total</span><span id="checkout-total">${fmt(total)}</span></div>
      </div>
    </div>
  `;
}

function selectShipping(key) {
  if (key !== 'standard') return;
  checkoutState.shippingMethod = key;
  renderCheckout();
}
window.selectShipping = selectShipping;

function applyPromo() {
  const input = document.getElementById('promo-input');
  checkoutState.promoCode = input.value.trim();
  const eligible = promoFreeShippingEligible();
  const discount = discountPercent();
  input.placeholder = eligible ? 'Free shipping applied' : discount ? '10% discount applied' : 'Code not recognized';
  const lines = cartLines();
  const subtotal = cartSubtotal();
  const freeShip = subtotal >= 75 || eligible;
  const rates = { standard: 6.99, express: 14.99, overnight: 29.99 };
  const shippingCost = freeShip ? 0 : rates[checkoutState.shippingMethod];
  const shippingElement = document.getElementById('checkout-shipping-cost');
  const totalElement = document.getElementById('checkout-total');
  if (shippingElement) shippingElement.textContent = freeShip ? 'Free' : fmt(shippingCost);
  if (totalElement) totalElement.textContent = fmt((subtotal * (1 - discount / 100)) + shippingCost);
  const discountRow = document.getElementById('checkout-discount-row');
  if (discountRow) {
    discountRow.style.display = discount ? 'flex' : 'none';
    discountRow.lastElementChild.textContent = discount ? `-${fmt(subtotal * discount / 100)}` : '';
  }
  document.querySelectorAll('.ship-option-price').forEach((element) => {
    element.textContent = freeShip ? 'Free' : element.textContent;
  });
}
window.applyPromo = applyPromo;

async function submitCheckout(e) {
  e.preventDefault();
  checkoutState.contact.email = document.getElementById('cf-email').value;
  checkoutState.address = {
    firstName: document.getElementById('cf-first').value.trim(),
    lastName: document.getElementById('cf-last').value.trim(),
    street: document.getElementById('cf-street').value.trim(),
    city: document.getElementById('cf-city').value.trim(),
    state: document.getElementById('cf-state').value.trim().toUpperCase(),
    zip: document.getElementById('cf-zip').value.trim(),
    country: document.getElementById('cf-country').value,
  };
  checkoutState.contact.email = checkoutState.contact.email.trim().toLowerCase();
  checkoutState.saveInfo = document.getElementById('save-info').checked;
  saveCheckoutInfo();
  checkoutState.promoCode = document.getElementById('promo-input').value.trim();

  const btn = document.getElementById('checkout-submit');
  btn.disabled = true;
  btn.textContent = 'Redirecting to payment…';

  try {
    const res = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((c) => ({ productId: c.productId, size: c.size, qty: c.qty })),
        shippingMethod: checkoutState.shippingMethod,
        promoCode: checkoutState.promoCode,
        contact: checkoutState.contact,
      }),
    });
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Checkout endpoint returned an invalid response (${res.status}).`);
    }
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    window.location.href = data.url; // Stripe Checkout hosted page
  } catch (err) {
    alert(err.message || 'Something went wrong starting checkout.');
    btn.disabled = false;
    btn.textContent = 'Continue to payment';
  }
}
window.submitCheckout = submitCheckout;

// ---------- Confirmation ----------
async function renderConfirmation(sessionId) {
  const params = new URLSearchParams(window.location.search);
  const id = sessionId || params.get('session_id');

  app.innerHTML = `<div class="confirm-wrap"><p style="color:var(--text-muted);">Loading your order…</p></div>`;
  if (!id) {
    app.innerHTML = `<div class="empty-state"><h2>No order found</h2></div>`;
    return;
  }

  try {
    const res = await fetch(`/order-details?session_id=${encodeURIComponent(id)}`);
    const responseText = await res.text();
    let order;
    try {
      order = JSON.parse(responseText);
    } catch {
      throw new Error(`Order endpoint returned an invalid response (${res.status}).`);
    }
    if (!res.ok) throw new Error(order.error || 'Could not load order');

    cart = []; // clear cart state after a successful order
    updateCartBadge();

    app.innerHTML = `
      <div class="confirm-wrap">
        <div class="confirm-icon">✓</div>
        <h1 style="font-size:26px;">Order confirmed</h1>
        <p style="color:var(--text-muted);margin-top:8px;">A confirmation has been sent to ${order.customer_email || 'your email'}.</p>
        <div class="confirm-detail">
          <div class="row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;"><span>Order tracking number</span><strong>${order.tracking_number || 'Pending'}</strong></div>
          ${order.line_items.map((li) => `
            <div class="row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;">
              <span>${li.description} × ${li.quantity}</span><span>${fmt(li.amount_total / 100)}</span>
            </div>
          `).join('')}
          <div class="row" style="display:flex;justify-content:space-between;padding-top:12px;margin-top:8px;border-top:1px solid var(--border);font-weight:700;">
            <span>Total</span><span>${fmt(order.amount_total / 100)}</span>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:28px;" onclick="go('shop')">Continue shopping</button>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><h2>Couldn't load order</h2><p>${err.message}</p></div>`;
  }
}

// ---------- Mobile nav ----------
function toggleMobileNav(open) {
  document.getElementById('mobile-nav-overlay').classList.toggle('open', open);
  document.getElementById('mobile-nav').classList.toggle('open', open);
}
window.toggleMobileNav = toggleMobileNav;

// ---------- Init ----------
(async function init() {
  loadSavedCheckoutInfo();
  await loadProducts();
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  const sessionId = params.get('session_id');
  if (page === 'confirmation' && sessionId) {
    renderConfirmation(sessionId);
  } else {
    renderHome();
    document.getElementById('newsletter-reopen').hidden = !localStorage.getItem(NEWSLETTER_DISMISSED_KEY);
    setTimeout(showNewsletterModal, 9000);
  }
  updateCartBadge();
})();
