// generate-product-pages.js
//
// Run this once from your project root (same folder as package.json):
//   node generate-product-pages.js
//
// What it does:
//   Copies public/index.html into public/products/<id>/index.html
//   for every product id below. That means a request to
//   https://desktopmat.com/products/black gets served a REAL FILE
//   that exists on disk — it does not depend on Vercel rewrites,
//   output directory detection, or any config working correctly.
//   Your app.js already reads window.location.pathname on load and
//   renders the right product, so this just makes sure there's
//   always a real file sitting at that URL for the server to find.
//
// Re-run this any time you add/rename/remove a product.

const fs = require('fs');
const path = require('path');

const PRODUCT_IDS = [
  'colored-mat',
  'light-purple', 'pale-mauve', 'pink', 'light-pink', 'grayish-lavender',
  'chocolate', 'brown', 'bronze', 'khaki', 'latte', 'eggshell', 'cream',
  'dark-blue', 'ice-blue', 'baby-blue', 'dark-green', 'jade-green', 'green',
  'peak-green', 'pale-green', 'sage-green', 'grayish-green', 'gray',
  'light-gray', 'silver', 'white', 'black', 'dark-gray',
];

const PUBLIC_DIR = path.join(__dirname, 'public');
const SOURCE_HTML = path.join(PUBLIC_DIR, 'index.html');

if (!fs.existsSync(SOURCE_HTML)) {
  console.error(`Could not find ${SOURCE_HTML}. Run this from your project root.`);
  process.exit(1);
}

const html = fs.readFileSync(SOURCE_HTML, 'utf8');

let created = 0;
for (const id of PRODUCT_IDS) {
  const dir = path.join(PUBLIC_DIR, 'products', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  created++;
}

console.log(`Done. Wrote public/products/<id>/index.html for ${created} products.`);
console.log('Commit and redeploy — every product URL is now a real static file.');