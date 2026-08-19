/* ============ DATA ============ */
const PRODUCTS = [
  {
    id:'ink-grid', name:'Ink Grid', pattern:'p-grid', tagline:'Precision grid, zero glare.',
    desc:"A charcoal surface ruled into a quiet 26mm grid — for people who like their desk the way they like their spreadsheets. Micro-textured top layer keeps mouse tracking accurate at any DPI, and the base won't creep on glass or laminate.",
    tag:'BESTSELLER',
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:27},
      {name:'Standard',dims:'900 × 400 mm',price:42},
      {name:'XL',dims:'1200 × 600 mm',price:57},
    ]
  },
  {
    id:'signal-stitch', name:'Signal Stitch', pattern:'p-stitch', tagline:'Contrast stitch, all business.',
    desc:"Signal-orange thread runs the full perimeter on a matte black base — the stitch line isn't decoration, it's reinforcement, so the edges won't fray after years of wrist traffic.",
    tag:'NEW',
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:29},
      {name:'Standard',dims:'900 × 400 mm',price:45},
      {name:'XL',dims:'1200 × 600 mm',price:61},
    ]
  },
  {
    id:'concrete-wave', name:'Concrete Wave', pattern:'p-wave', tagline:'Soft wave, hard surface.',
    desc:"A subtle concentric ripple pressed into a warm-gray weave. Reads calm from a distance, technical up close — the ripple depth is tuned so it never interferes with optical or laser sensors.",
    tag:null,
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:25},
      {name:'Standard',dims:'900 × 400 mm',price:39},
      {name:'XL',dims:'1200 × 600 mm',price:53},
    ]
  },
  {
    id:'carbon-weave', name:'Carbon Weave', pattern:'p-weave', tagline:'Diagonal weave texture.',
    desc:"Cross-hatched diagonal texture inspired by carbon panels, printed on a low-friction cloth top. Built for glide — this is the pick for anyone who plays as hard as they work.",
    tag:null,
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:32},
      {name:'Standard',dims:'900 × 400 mm',price:48},
      {name:'XL',dims:'1200 × 600 mm',price:65},
    ]
  },
  {
    id:'topo-line', name:'Topo Line', pattern:'p-topo', tagline:'Contour lines, desk terrain.',
    desc:"Topographic contour rings map the surface like elevation lines on a survey chart. A quiet flex for the desk-tour crowd, without shouting about it.",
    tag:null,
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:28},
      {name:'Standard',dims:'900 × 400 mm',price:44},
      {name:'XL',dims:'1200 × 600 mm',price:59},
    ]
  },
  {
    id:'mono-fade', name:'Mono Fade', pattern:'p-fade', tagline:'Black to graphite fade.',
    desc:"A clean diagonal gradient from deep ink to graphite. No pattern, no noise — just a mat that disappears under whatever you put on it.",
    tag:null,
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:24},
      {name:'Standard',dims:'900 × 400 mm',price:38},
      {name:'XL',dims:'1200 × 600 mm',price:52},
    ]
  },
  {
    id:'dot-grid', name:'Dot Grid', pattern:'p-dots', tagline:'Minimalist dot matrix.',
    desc:"Light concrete base with a fine 16mm dot matrix — the same grid your notebook uses, sized up for a desk. Pairs well with light-wood and aluminum setups.",
    tag:null,
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:22},
      {name:'Standard',dims:'900 × 400 mm',price:36},
      {name:'XL',dims:'1200 × 600 mm',price:49},
    ]
  },
  {
    id:'deskscape', name:'Deskscape', pattern:'p-scape', tagline:'Full-desk command layout.',
    desc:"Our largest-format design, built for keyboard-plus-mouse-plus-everything-else setups. A single signal-orange horizon line splits the surface into zones so your desk finally has a floor plan.",
    tag:'BESTSELLER',
    sizes:[
      {name:'Compact',dims:'350 × 250 mm',price:34},
      {name:'Standard',dims:'900 × 400 mm',price:52},
      {name:'XL',dims:'1200 × 600 mm',price:69},
    ]
  },
];

const FREE_SHIP_THRESHOLD = 75;
const TAX_RATE = 0.0725;
const SHIP_OPTIONS = [
  {id:'standard', name:'Standard shipping', eta:'5–7 business days', cost:6.5},
  {id:'express', name:'Express shipping', eta:'2–3 business days', cost:14.9},
  {id:'overnight', name:'Overnight', eta:'Next business day', cost:28},
];

/* ============ STATE ============ */
let cart = [];               // {productId, size, qty}
let currentPage = 'home';
let currentProductId = null;
let selectedSize = {};        // per product-detail session
let shopFilter = 'all';
let shopSort = 'featured';
let shopSearch = '';
let selectedShipId = 'standard';
let lastOrder = null;

/* ============ HELPERS ============ */
function money(n){ return '$' + n.toFixed(2); }
function findProduct(id){ return PRODUCTS.find(p=>p.id===id); }
function cheapestPrice(p){ return Math.min(...p.sizes.map(s=>s.price)); }

function cartLineTotal(line){
  const p = findProduct(line.productId);
  const s = p.sizes.find(s=>s.name===line.size);
  return s.price * line.qty;
}
function cartSubtotal(){
  return cart.reduce((sum,l)=>sum + cartLineTotal(l),0);
}
function cartCount(){
  return cart.reduce((sum,l)=>sum + l.qty,0);
}
function selectedShip(){
  return SHIP_OPTIONS.find(s=>s.id===selectedShipId);
}
function shippingCost(){
  const sub = cartSubtotal();
  if(sub === 0) return 0;
  if(sub >= FREE_SHIP_THRESHOLD) return 0;
  return selectedShip().cost;
}
function taxAmount(){
  return cartSubtotal() * TAX_RATE;
}
function cartTotal(){
  return cartSubtotal() + shippingCost() + taxAmount();
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ============ CART OPS ============ */
function addToCart(productId, size, qty){
  qty = qty || 1;
  const existing = cart.find(l=>l.productId===productId && l.size===size);
  if(existing){ existing.qty += qty; }
  else { cart.push({productId, size, qty}); }
  renderCartCount();
  renderDrawer();
  const p = findProduct(productId);
  showToast(`Added ${p.name} (${size}) to your bag`);
}
function updateQty(productId, size, delta){
  const line = cart.find(l=>l.productId===productId && l.size===size);
  if(!line) return;
  line.qty += delta;
  if(line.qty <= 0){ cart = cart.filter(l=>l!==line); }
  renderCartCount();
  renderDrawer();
  if(currentPage==='cart') renderPage();
}
function removeLine(productId, size){
  cart = cart.filter(l=>!(l.productId===productId && l.size===size));
  renderCartCount();
  renderDrawer();
  if(currentPage==='cart') renderPage();
}
function renderCartCount(){
  document.getElementById('cartCount').textContent = cartCount();
}

/* ============ DRAWER ============ */
function openDrawer(){
  document.getElementById('overlay').classList.add('show');
  document.getElementById('drawer').classList.add('show');
  renderDrawer();
}
function closeDrawer(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('drawer').classList.remove('show');
}
function renderDrawer(){
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  if(cart.length === 0){
    body.innerHTML = `<div class="empty-state">
      <div class="glyph">▢</div>
      <p>Your bag is empty.<br>Time to fix that.</p>
      <button class="btn" onclick="closeDrawer();go('shop')">Shop mats</button>
    </div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map(line=>{
    const p = findProduct(line.productId);
    return `<div class="cart-line">
      <div class="thumb ${p.pattern}"></div>
      <div class="meta">
        <h4>${p.name}</h4>
        <div class="size">${line.size}</div>
        <div class="qty-stepper">
          <button onclick="updateQty('${p.id}','${line.size}',-1)" aria-label="Decrease quantity">−</button>
          <span>${line.qty}</span>
          <button onclick="updateQty('${p.id}','${line.size}',1)" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-x" onclick="removeLine('${p.id}','${line.size}')">Remove</button>
      </div>
      <div class="line-price">${money(cartLineTotal(line))}</div>
    </div>`;
  }).join('');

  const sub = cartSubtotal();
  const remaining = FREE_SHIP_THRESHOLD - sub;
  foot.innerHTML = `
    ${remaining > 0 ? `<p style="font-size:12px;font-family:var(--font-mono);margin-bottom:14px;background:var(--paper);border:1.5px dashed var(--ink);padding:9px 12px;">Add ${money(remaining)} more for free shipping</p>` : `<p style="font-size:12px;font-family:var(--font-mono);margin-bottom:14px;color:var(--success);font-weight:700;">✓ Free shipping unlocked</p>`}
    <div class="sum-row"><span>Subtotal</span><span class="val">${money(sub)}</span></div>
    <div class="sum-row total"><span>Estimated total</span><span class="val">${money(sub)}</span></div>
    <button class="btn btn-block" style="margin-top:16px;" onclick="closeDrawer();go('cart')">View bag & checkout</button>
  `;
}

/* ============ ROUTING ============ */
function go(page, param){
  currentPage = page;
  if(page === 'product') currentProductId = param;
  if(page === 'shop' && param) shopFilter = param;
  window.scrollTo({top:0, behavior:'instant'});
  closeDrawer();
  document.getElementById('mobileNav').classList.remove('show');
  document.querySelectorAll('.navlink').forEach(b=>{
    b.classList.toggle('active', b.dataset.page === page);
  });
  renderPage();
}
function toggleMobileNav(){
  document.getElementById('mobileNav').classList.toggle('show');
}

function renderPage(){
  const app = document.getElementById('app');
  if(page_renderers[currentPage]){
    app.innerHTML = page_renderers[currentPage]();
    if(page_afterRender[currentPage]) page_afterRender[currentPage]();
  }
}

const page_renderers = {};
const page_afterRender = {};

/* ============ HOME PAGE ============ */
page_renderers.home = function(){
  const featured = PRODUCTS.slice(0,4);
  return `
  <section class="hero">
    <div class="wrap hero-inner">
      <div>
        <div class="eyebrow">Stitched-edge desk mats</div>
        <h1>YOUR DESK.<br><span>UNDER CONTROL.</span></h1>
        <p class="sub">Precision-stitched surfaces built for keyboards, mice, and everything that lands on a desk at 2am. Eight designs, three sizes, zero curling edges.</p>
        <div class="hero-ctas">
          <button class="btn" onclick="go('shop')">Shop all mats</button>
          <button class="btn btn-outline" onclick="go('about')">Our materials</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><b>8</b><span>Designs</span></div>
          <div class="hero-stat"><b>3</b><span>Sizes</span></div>
          <div class="hero-stat"><b>4.8/5</b><span>Rated by owners</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-mat p-scape"></div>
        <div class="hero-badge">STITCHED EDGE<br>NO-FRAY GUARANTEE</div>
      </div>
    </div>
  </section>

  <section class="section wrap">
    <div class="section-head">
      <div>
        <h2>Featured mats</h2>
        <p>The four people keep coming back for. Start here if you're not sure.</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="go('shop')">View all →</button>
    </div>
    <div class="prod-grid">
      ${featured.map(productCard).join('')}
    </div>
  </section>

  <section class="section wrap" style="padding-top:0;">
    <div class="section-head" style="border-bottom:none;">
      <div>
        <h2>Built like it matters</h2>
        <p>Every mat, same standard.</p>
      </div>
    </div>
    <div class="value-grid">
      <div class="value-card">
        <div class="num">01</div>
        <h3>Stitched perimeter</h3>
        <p>Reinforced edge stitching stops fraying and curling for the life of the mat.</p>
      </div>
      <div class="value-card">
        <div class="num">02</div>
        <h3>Sensor-safe surface</h3>
        <p>Tuned micro-texture tracks cleanly with optical and laser sensors at any DPI.</p>
      </div>
      <div class="value-card">
        <div class="num">03</div>
        <h3>Rubber base grip</h3>
        <p>Won't creep on glass, laminate, or wood — even under a heavy mechanical board.</p>
      </div>
    </div>
  </section>
  `;
};

function productCard(p){
  return `<div class="prod-card" onclick="go('product','${p.id}')">
    <div class="swatch ${p.pattern.includes('dots') ? 'dots' : ''}">
      <div class="${p.pattern}" style="position:absolute;inset:0;"></div>
      ${p.tag ? `<div class="tag">${p.tag}</div>` : ''}
    </div>
    <div class="info">
      <h3>${p.name}</h3>
      <p class="tagline">${p.tagline}</p>
      <div class="price-row">
        <div>
          <span class="from">From</span>
          <span class="price">${money(cheapestPrice(p))}</span>
        </div>
        <button class="mini-add" onclick="event.stopPropagation();quickAdd('${p.id}')" aria-label="Quick add">+</button>
      </div>
    </div>
  </div>`;
}
function quickAdd(id){
  const p = findProduct(id);
  addToCart(id, p.sizes[0].name, 1);
}

/* ============ SHOP PAGE ============ */
page_renderers.shop = function(){
  let list = PRODUCTS.slice();
  if(shopFilter !== 'all'){
    list = list.filter(p => p.sizes.some(s => s.name.toLowerCase() === shopFilter));
  }
  if(shopSearch.trim()){
    const q = shopSearch.trim().toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q));
  }
  if(shopSort === 'price-asc') list.sort((a,b)=>cheapestPrice(a)-cheapestPrice(b));
  if(shopSort === 'price-desc') list.sort((a,b)=>cheapestPrice(b)-cheapestPrice(a));
  if(shopSort === 'name') list.sort((a,b)=>a.name.localeCompare(b.name));

  return `
  <div class="wrap">
    <div class="crumb">Home / Shop</div>
    <div class="section-head" style="margin-top:14px;">
      <div>
        <h2>All desk mats</h2>
        <p>${list.length} design${list.length===1?'':'s'} available</p>
      </div>
    </div>
    <div class="filter-bar">
      <div class="chip-row">
        <button class="chip ${shopFilter==='all'?'active':''}" onclick="setShopFilter('all')">All</button>
        <button class="chip ${shopFilter==='compact'?'active':''}" onclick="setShopFilter('compact')">Compact</button>
        <button class="chip ${shopFilter==='standard'?'active':''}" onclick="setShopFilter('standard')">Standard</button>
        <button class="chip ${shopFilter==='xl'?'active':''}" onclick="setShopFilter('xl')">XL</button>
      </div>
      <div style="display:flex;gap:10px;">
        <input class="search-box" placeholder="Search mats..." value="${shopSearch}" oninput="setShopSearch(this.value)">
        <select class="select-sort" onchange="setShopSort(this.value)">
          <option value="featured" ${shopSort==='featured'?'selected':''}>Featured</option>
          <option value="price-asc" ${shopSort==='price-asc'?'selected':''}>Price: low to high</option>
          <option value="price-desc" ${shopSort==='price-desc'?'selected':''}>Price: high to low</option>
          <option value="name" ${shopSort==='name'?'selected':''}>Name A–Z</option>
        </select>
      </div>
    </div>
    ${list.length ? `<div class="prod-grid">${list.map(productCard).join('')}</div>` :
      `<div class="empty-state"><div class="glyph">◇</div><p>No mats match that search.</p><button class="btn" onclick="setShopFilter('all')">Clear filters</button></div>`}
  </div>
  <div style="height:70px;"></div>
  `;
};
function setShopFilter(f){ shopFilter = f; renderPage(); }
function setShopSort(s){ shopSort = s; renderPage(); }
function setShopSearch(v){ shopSearch = v; renderPage();
  setTimeout(()=>{ const el=document.querySelector('.search-box'); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },0);
}

/* ============ PRODUCT DETAIL PAGE ============ */
page_renderers.product = function(){
  const p = findProduct(currentProductId);
  if(!p) return `<div class="wrap"><div class="empty-state"><p>That mat wandered off.</p><button class="btn" onclick="go('shop')">Back to shop</button></div></div>`;
  if(!selectedSize[p.id]) selectedSize[p.id] = p.sizes[0].name;
  const size = p.sizes.find(s=>s.name===selectedSize[p.id]);

  const related = PRODUCTS.filter(rp=>rp.id!==p.id).sort(()=>0.5-Math.random()).slice(0,4);

  return `
  <div class="wrap">
    <div class="crumb">
      <button onclick="go('home')">Home</button> / <button onclick="go('shop')">Shop</button> / ${p.name}
    </div>
    <div class="pd-grid">
      <div>
        <div class="pd-hero ${p.pattern} ${p.pattern.includes('dots')?'dots':''}">
          ${p.tag ? `<div class="tag" style="position:absolute;top:14px;left:14px;background:var(--chalk);border:1px solid var(--ink);padding:5px 10px;font-family:var(--font-mono);font-size:11px;font-weight:700;">${p.tag}</div>` : ''}
        </div>
        <div class="pd-thumbs">
          ${[p.pattern,'p-grid','p-stitch','p-wave'].slice(0,4).map((pat,i)=>`<div class="pd-thumb ${pat} ${i===0?'active':''}"></div>`).join('')}
        </div>
      </div>
      <div class="pd-info">
        <div class="pd-title-row">
          <div>
            <h1>${p.name}</h1>
            <p class="tagline">${p.tagline}</p>
          </div>
        </div>
        <div class="stock-badge"><span class="dot"></span>In stock — ships in 1–2 days</div>

        <div class="opt-label"><span>Size</span><span class="sel">${size.dims}</span></div>
        <div class="size-opts">
          ${p.sizes.map(s=>`
            <button class="size-opt ${s.name===selectedSize[p.id]?'active':''}" onclick="pickSize('${p.id}','${s.name}')">
              ${s.name}
              <span class="dims">${s.dims}</span>
              <span class="sprice">${money(s.price)}</span>
            </button>
          `).join('')}
        </div>

        <div class="pd-price-line">
          <span class="big">${money(size.price)}</span>
          <span style="font-size:12px;color:var(--graphite);">Free shipping over ${money(FREE_SHIP_THRESHOLD)}</span>
        </div>

        <div class="qty-row">
          <div class="qty-stepper" style="height:44px;">
            <button style="width:34px;height:42px;font-size:18px;" onclick="pdQty(-1)">−</button>
            <span id="pdQtyVal" style="width:38px;font-size:14px;">1</span>
            <button style="width:34px;height:42px;font-size:18px;" onclick="pdQty(1)">+</button>
          </div>
          <button class="btn" style="flex:1;" onclick="pdAddToCart('${p.id}')">Add to bag</button>
        </div>
        <button class="btn btn-outline btn-block" onclick="pdAddToCart('${p.id}', true)">Buy it now</button>

        <div class="trust-row">
          <div class="trust-item">↺ 30-day returns</div>
          <div class="trust-item">✓ No-fray stitch guarantee</div>
          <div class="trust-item">◈ Machine washable</div>
        </div>

        <div class="pd-desc">
          <h4>Details</h4>
          <p>${p.desc}</p>
          <table class="spec-table">
            <tr><td>Top material</td><td>Woven cloth, sealed edge</td></tr>
            <tr><td>Base</td><td>Natural rubber, non-slip</td></tr>
            <tr><td>Thickness</td><td>4 mm</td></tr>
            <tr><td>Care</td><td>Cold wash, air dry</td></tr>
            <tr><td>Selected size</td><td>${size.dims}</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div class="related-strip">
      <div class="section-head">
        <div><h2>Pairs well with</h2></div>
      </div>
      <div class="prod-grid">${related.map(productCard).join('')}</div>
    </div>
  </div>
  <div style="height:60px;"></div>
  `;
};
let pdQtyVal = 1;
function pdQty(delta){
  pdQtyVal = Math.max(1, pdQtyVal + delta);
  const el = document.getElementById('pdQtyVal');
  if(el) el.textContent = pdQtyVal;
}
function pickSize(pid, sizeName){
  selectedSize[pid] = sizeName;
  renderPage();
}
function pdAddToCart(pid, buyNow){
  addToCart(pid, selectedSize[pid], pdQtyVal);
  pdQtyVal = 1;
  if(buyNow){ go('cart'); }
}
page_afterRender.product = function(){ pdQtyVal = 1; };

/* ============ CART PAGE ============ */
page_renderers.cart = function(){
  if(cart.length === 0){
    return `<div class="wrap">
      <div class="crumb">Home / Bag</div>
      <div class="empty-state" style="padding:100px 10px;">
        <div class="glyph">▢</div>
        <p>Your bag is empty.<br>Let's find you a mat.</p>
        <button class="btn" onclick="go('shop')">Shop all mats</button>
      </div>
    </div>`;
  }
  const sub = cartSubtotal();
  const remaining = FREE_SHIP_THRESHOLD - sub;
  return `
  <div class="wrap">
    <div class="crumb">Home / Bag</div>
    <div class="section-head" style="margin-top:14px;">
      <div><h2>Your bag</h2><p>${cartCount()} item${cartCount()===1?'':'s'}</p></div>
      <button class="chip" onclick="go('shop')">+ Add more mats</button>
    </div>
    <div class="checkout-grid" style="align-items:start;">
      <div>
        ${remaining > 0 ? `<p style="font-size:12px;font-family:var(--font-mono);margin-bottom:18px;background:var(--chalk);border:1.5px dashed var(--ink);padding:10px 14px;">Add ${money(remaining)} more for free shipping</p>` : `<p style="font-size:12px;font-family:var(--font-mono);margin-bottom:18px;color:var(--success);font-weight:700;">✓ Free shipping unlocked</p>`}
        <div class="form-card" style="padding:6px 26px;">
          ${cart.map(line=>{
            const p = findProduct(line.productId);
            return `<div class="cart-line">
              <div class="thumb ${p.pattern}" style="width:100px;height:74px;cursor:pointer;" onclick="go('product','${p.id}')"></div>
              <div class="meta">
                <h4 style="cursor:pointer;" onclick="go('product','${p.id}')">${p.name}</h4>
                <div class="size">${line.size}</div>
                <div class="qty-stepper">
                  <button onclick="updateQty('${p.id}','${line.size}',-1)">−</button>
                  <span>${line.qty}</span>
                  <button onclick="updateQty('${p.id}','${line.size}',1)">+</button>
                </div>
                <button class="remove-x" onclick="removeLine('${p.id}','${line.size}')">Remove</button>
              </div>
              <div class="line-price">${money(cartLineTotal(line))}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="summary-card" style="position:static;">
        <h3>Order summary</h3>
        <div class="sum-row"><span>Subtotal</span><span class="val">${money(sub)}</span></div>
        <div class="sum-row"><span>Shipping</span><span class="val">Calculated at checkout</span></div>
        <div class="sum-row"><span>Tax</span><span class="val">Calculated at checkout</span></div>
        <div class="sum-row total"><span>Estimated total</span><span class="val">${money(sub)}</span></div>
        <button class="btn btn-block" style="margin-top:18px;background:var(--signal);border-color:var(--signal);" onclick="go('checkout')">Proceed to checkout →</button>
        <div class="secure-note">🔒 Secure demo checkout</div>
      </div>
    </div>
  </div>
  <div style="height:60px;"></div>
  `;
};

/* ============ CHECKOUT PAGE ============ */
let checkoutData = {
  email:'', firstName:'', lastName:'', address:'', apt:'', city:'', state:'', zip:'', country:'United States', phone:'',
  cardName:'', cardNumber:'', cardExp:'', cardCvc:'',
};
let checkoutErrors = {};

page_renderers.checkout = function(){
  if(cart.length === 0){
    return `<div class="wrap"><div class="empty-state" style="padding:100px 10px;"><div class="glyph">▢</div><p>Your bag is empty — add a mat before checking out.</p><button class="btn" onclick="go('shop')">Shop all mats</button></div></div>`;
  }
  const sub = cartSubtotal();
  const ship = shippingCost();
  const tax = taxAmount();
  const total = cartTotal();

  return `
  <div class="wrap">
    <div class="crumb">Home / Bag / Checkout</div>
    <div class="co-steps" style="margin-top:14px;">
      <div class="co-step done"><span class="num">✓</span>Bag</div>
      <div class="co-step current"><span class="num">2</span>Information</div>
      <div class="co-step"><span class="num">3</span>Confirmation</div>
    </div>

    <div class="checkout-grid">
      <div>
        <div class="form-card">
          <h3><span class="n">1</span>Contact</h3>
          <div class="form-row single">
            ${field('email','Email','email','you@example.com')}
          </div>
          <div class="form-row single">
            ${field('phone','Phone (optional)','tel','(555) 555-0199')}
          </div>
        </div>

        <div class="form-card">
          <h3><span class="n">2</span>Shipping address</h3>
          <div class="form-row">
            ${field('firstName','First name','text','Jordan')}
            ${field('lastName','Last name','text','Rivera')}
          </div>
          <div class="form-row single">
            ${field('address','Address','text','123 Desk Street')}
          </div>
          <div class="form-row single">
            ${field('apt','Apartment, suite, etc. (optional)','text','')}
          </div>
          <div class="form-row three">
            ${field('city','City','text','Portland')}
            ${field('state','State','text','OR')}
            ${field('zip','ZIP code','text','97201')}
          </div>
          <div class="form-row single">
            <div class="field">
              <label for="f_country">Country</label>
              <select id="f_country" onchange="setCheckoutField('country', this.value)">
                ${['United States','Canada','United Kingdom','Australia','Germany','France'].map(c=>`<option ${checkoutData.country===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="form-card">
          <h3><span class="n">3</span>Shipping method</h3>
          <div class="ship-opts">
            ${SHIP_OPTIONS.map(s=>`
              <label class="ship-opt ${selectedShipId===s.id?'active':''}" onclick="setShipMethod('${s.id}')">
                <div class="left">
                  <input type="radio" name="ship" ${selectedShipId===s.id?'checked':''} readonly>
                  <div>
                    <div class="name">${s.name}</div>
                    <div class="eta">${s.eta}</div>
                  </div>
                </div>
                <div class="cost">${sub >= FREE_SHIP_THRESHOLD ? 'FREE' : money(s.cost)}</div>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-card">
          <h3><span class="n">4</span>Payment</h3>
          <p style="font-size:12px;color:var(--graphite);margin-bottom:16px;">This is a demo store — no real card is charged. Any values pass validation as long as they're formatted correctly.</p>
          <div class="form-row single">
            ${field('cardName','Name on card','text','Jordan Rivera')}
          </div>
          <div class="form-row single">
            ${field('cardNumber','Card number','text','4242 4242 4242 4242')}
          </div>
          <div class="form-row">
            ${field('cardExp','Expiry (MM/YY)','text','08/29')}
            ${field('cardCvc','CVC','text','123')}
          </div>
          <div class="card-brands">
            <span>VISA</span><span>MASTERCARD</span><span>AMEX</span><span>DISCOVER</span>
          </div>
        </div>

        <button class="btn btn-block" id="placeOrderBtn" style="background:var(--signal);border-color:var(--signal);padding:18px;font-size:14px;" onclick="placeOrder()">
          Place order — ${money(total)}
        </button>
      </div>

      <div class="summary-card">
        <h3>Order summary</h3>
        ${cart.map(line=>{
          const p = findProduct(line.productId);
          return `<div class="sum-line-item">
            <div class="thumb ${p.pattern}"></div>
            <div class="meta">
              <div>${p.name}</div>
              <div class="qn">${line.size} · Qty ${line.qty}</div>
            </div>
            <div class="p">${money(cartLineTotal(line))}</div>
          </div>`;
        }).join('')}
        <div class="sum-row" style="margin-top:16px;"><span>Subtotal</span><span class="val">${money(sub)}</span></div>
        <div class="sum-row"><span>Shipping</span><span class="val">${ship===0 ? 'FREE' : money(ship)}</span></div>
        <div class="sum-row"><span>Tax (est.)</span><span class="val">${money(tax)}</span></div>
        <div class="sum-row total"><span>Total</span><span class="val">${money(total)}</span></div>
        <div class="promo-row">
          <input placeholder="Promo code" id="promoInput">
          <button class="btn btn-sm" onclick="applyPromo()">Apply</button>
        </div>
        <p class="promo-note" id="promoNote"></p>
        <div class="secure-note">🔒 Encrypted demo checkout</div>
      </div>
    </div>
  </div>
  <div style="height:60px;"></div>
  `;
};

function field(key, label, type, placeholder){
  const hasError = !!checkoutErrors[key];
  return `<div class="field ${hasError?'error':''}">
    <label for="f_${key}">${label}</label>
    <input id="f_${key}" type="${type}" placeholder="${placeholder}" value="${checkoutData[key]||''}"
      oninput="setCheckoutField('${key}', this.value)">
    <div class="err-msg">${checkoutErrors[key]||''}</div>
  </div>`;
}
function setCheckoutField(key, val){
  checkoutData[key] = val;
  if(checkoutErrors[key]){ delete checkoutErrors[key]; }
}
function setShipMethod(id){
  selectedShipId = id;
  renderPage();
}
function applyPromo(){
  const val = document.getElementById('promoInput').value.trim().toUpperCase();
  const note = document.getElementById('promoNote');
  if(val === 'DESKTOP10'){
    note.textContent = 'Promo applied — 10% off will be reflected at final confirmation.';
    note.style.color = 'var(--success)';
  } else if(val === ''){
    note.textContent = 'Enter a code first.';
    note.style.color = '#e2836f';
  } else {
    note.textContent = 'That code is not valid.';
    note.style.color = '#e2836f';
  }
}

function validateCheckout(){
  const errs = {};
  const d = checkoutData;
  if(!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errs.email = 'Enter a valid email address.';
  if(!d.firstName) errs.firstName = 'Required.';
  if(!d.lastName) errs.lastName = 'Required.';
  if(!d.address) errs.address = 'Required.';
  if(!d.city) errs.city = 'Required.';
  if(!d.state) errs.state = 'Required.';
  if(!d.zip || d.zip.trim().length < 3) errs.zip = 'Enter a valid postal code.';
  if(!d.cardName) errs.cardName = 'Required.';
  const digits = (d.cardNumber||'').replace(/\s/g,'');
  if(!/^\d{13,19}$/.test(digits)) errs.cardNumber = 'Enter a valid card number.';
  if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test((d.cardExp||'').trim())) errs.cardExp = 'Use MM/YY format.';
  if(!/^\d{3,4}$/.test((d.cardCvc||'').trim())) errs.cardCvc = 'Enter a valid CVC.';
  checkoutErrors = errs;
  return Object.keys(errs).length === 0;
}

function placeOrder(){
  if(!validateCheckout()){
    renderPage();
    const firstKey = Object.keys(checkoutErrors)[0];
    const el = document.getElementById('f_'+firstKey);
    if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.focus(); }
    showToast('Check the highlighted fields');
    return;
  }
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing order...';
  setTimeout(()=>{
    const orderId = 'DM-' + Math.floor(100000 + Math.random()*900000);
    const now = new Date();
    const shipDays = selectedShipId==='overnight' ? 1 : selectedShipId==='express' ? 3 : 7;
    const eta = new Date(now.getTime() + shipDays*86400000);
    lastOrder = {
      id: orderId,
      date: now,
      eta: eta,
      items: cart.map(l=>({...l})),
      subtotal: cartSubtotal(),
      shipping: shippingCost(),
      tax: taxAmount(),
      total: cartTotal(),
      shipMethod: selectedShip().name,
      customer: {...checkoutData},
    };
    cart = [];
    checkoutData = {email:'', firstName:'', lastName:'', address:'', apt:'', city:'', state:'', zip:'', country:'United States', phone:'', cardName:'', cardNumber:'', cardExp:'', cardCvc:''};
    checkoutErrors = {};
    renderCartCount();
    go('confirmation');
  }, 1100);
}

/* ============ CONFIRMATION PAGE ============ */
page_renderers.confirmation = function(){
  if(!lastOrder){
    return `<div class="wrap"><div class="empty-state" style="padding:100px 10px;"><div class="glyph">◇</div><p>No recent order found.</p><button class="btn" onclick="go('shop')">Shop all mats</button></div></div>`;
  }
  const o = lastOrder;
  return `
  <div class="wrap">
    <div class="confirm-wrap">
      <div class="confirm-check">✓</div>
      <h1>Order placed</h1>
      <p class="oid">Order ${o.id} · Confirmation sent to ${o.customer.email}</p>

      <div class="confirm-grid">
        <div class="confirm-card">
          <h4>Shipping to</h4>
          <p style="font-size:14px;line-height:1.6;">
            ${o.customer.firstName} ${o.customer.lastName}<br>
            ${o.customer.address}${o.customer.apt ? ', '+o.customer.apt : ''}<br>
            ${o.customer.city}, ${o.customer.state} ${o.customer.zip}<br>
            ${o.customer.country}
          </p>
        </div>
        <div class="confirm-card">
          <h4>Delivery</h4>
          <p style="font-size:14px;line-height:1.6;">
            ${o.shipMethod}<br>
            Estimated arrival<br>
            <b>${o.eta.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})}</b>
          </p>
        </div>
      </div>

      <div class="confirm-card">
        <h4>Order details</h4>
        ${o.items.map(line=>{
          const p = findProduct(line.productId);
          const s = p.sizes.find(s=>s.name===line.size);
          return `<div class="cart-line">
            <div class="thumb ${p.pattern}"></div>
            <div class="meta">
              <h4>${p.name}</h4>
              <div class="size">${line.size} · Qty ${line.qty}</div>
            </div>
            <div class="line-price">${money(s.price*line.qty)}</div>
          </div>`;
        }).join('')}
        <div class="sum-row" style="margin-top:14px;"><span>Subtotal</span><span class="val">${money(o.subtotal)}</span></div>
        <div class="sum-row"><span>Shipping</span><span class="val">${o.shipping===0?'FREE':money(o.shipping)}</span></div>
        <div class="sum-row"><span>Tax</span><span class="val">${money(o.tax)}</span></div>
        <div class="sum-row total"><span>Total paid</span><span class="val">${money(o.total)}</span></div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
        <button class="btn" onclick="go('shop')">Continue shopping</button>
        <button class="btn btn-outline" onclick="go('home')">Back to home</button>
      </div>
    </div>
  </div>
  `;
};

/* ============ ABOUT PAGE ============ */
page_renderers.about = function(){
  return `
  <div class="wrap static-page">
    <div class="crumb">Home / About</div>
    <h1 style="margin-top:20px;">We make the surface<br>you rest your hands on.</h1>
    <p>DESKTOPMAT started with one complaint: every desk mat we owned curled at the edges within a year. So we rebuilt the category from the stitch up — literally. Every mat we sell runs a reinforced perimeter stitch, the same construction used on heavy canvas gear, so the edge holds no matter how many times a wrist lands on it.</p>
    <p>We design in-house, test with people who are at a keyboard eight-plus hours a day, and keep the catalog small on purpose — eight designs, three sizes, nothing you have to think too hard about.</p>
    <h2>Materials</h2>
    <p>Tops are a low-friction woven cloth bonded to a 4mm natural rubber base. The base is heavy enough to stay put on glass and laminate desks without adhesive, and the whole mat is machine washable when it inevitably meets coffee.</p>
    <div class="value-grid">
      <div class="value-card"><div class="num">01</div><h3>Small batch</h3><p>We run limited print batches per design instead of mass-producing everything at once.</p></div>
      <div class="value-card"><div class="num">02</div><h3>Tested at the desk</h3><p>Every prototype spends a month under a real keyboard before it ships.</p></div>
      <div class="value-card"><div class="num">03</div><h3>No-fray guarantee</h3><p>If the stitch edge frays within a year, we replace it — no questions.</p></div>
    </div>
    <div style="margin-top:40px;">
      <button class="btn" onclick="go('shop')">Shop the collection</button>
    </div>
  </div>
  `;
};

/* ============ CONTACT PAGE ============ */
let contactSent = false;
page_renderers.contact = function(){
  if(contactSent){
    return `<div class="wrap static-page">
      <div class="crumb">Home / Contact</div>
      <div class="confirm-check" style="margin-top:30px;">✓</div>
      <h1 style="font-size:32px;">Message sent</h1>
      <p>Thanks for reaching out — we typically reply within one business day.</p>
      <button class="btn" style="margin-top:10px;" onclick="contactSent=false;go('contact')">Send another message</button>
    </div>`;
  }
  return `
  <div class="wrap static-page">
    <div class="crumb">Home / Contact</div>
    <h1 style="margin-top:20px;">Get in touch</h1>
    <p>Questions about an order, a design, or a bulk request for the office — send it over.</p>
    <div class="form-card" style="margin-top:26px;max-width:520px;">
      <div class="form-row single">
        <div class="field"><label>Name</label><input id="c_name" placeholder="Jordan Rivera"></div>
      </div>
      <div class="form-row single">
        <div class="field"><label>Email</label><input id="c_email" type="email" placeholder="you@example.com"></div>
      </div>
      <div class="form-row single">
        <div class="field"><label>Message</label>
          <textarea id="c_msg" rows="5" style="width:100%;border:2px solid var(--line);background:var(--chalk);padding:11px 12px;font-size:14px;font-family:inherit;"></textarea>
        </div>
      </div>
      <button class="btn btn-block" onclick="sendContact()">Send message</button>
    </div>
  </div>
  `;
};
function sendContact(){
  const name = document.getElementById('c_name').value.trim();
  const email = document.getElementById('c_email').value.trim();
  const msg = document.getElementById('c_msg').value.trim();
  if(!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !msg){
    showToast('Fill in every field with a valid email');
    return;
  }
  contactSent = true;
  renderPage();
}

/* ============ INIT ============ */
go('home');
