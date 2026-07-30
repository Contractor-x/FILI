# Phase 2 — Public Storefront (Read-Only)

Goal: a visitor can land on the homepage, browse categories, view product details with variants, and add items to a cart — all without auth or checkout. No writes to Supabase happen in this phase (except reads).

---

## 1. Pages in scope

| Page | File | Purpose |
|---|---|---|
| Homepage | `index.html` | Shoppable hero + category tiles + featured products grid |
| Category listing | `category.html?slug=xxx` | Grid of products filtered by category |
| Product detail | `product.html?slug=xxx` | Full product info, variant picker, add-to-cart |
| Cart | `cart.html` | Line items, quantity edit, remove, subtotal |

Out of scope this phase: login, checkout, admin. Cart is **localStorage only** — no `orders` table writes yet.

---

## 2. Homepage (`index.html`)

### Sections
1. **Shoppable hero** — banner image/carousel, clicking it navigates to a category or featured product (not a generic "About" link)
2. **Category tiles** — pulled from `categories` table, each links to `category.html?slug=...`
3. **Featured products grid** — e.g. products where `is_active = true`, most recent or manually flagged as featured (add a `featured boolean default false` column to `products` if you want manual control — cheap addition now, or just show newest N)

### Data fetch (`js/api/products.js`)
```javascript
import { supabase } from '../supabaseClient.js';

export async function getFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
```

```javascript
// js/api/categories.js
import { supabase } from '../supabaseClient.js';

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name');
  if (error) throw error;
  return data;
}
```

### Render pattern (`js/pages/home.js`)
```javascript
import { getFeaturedProducts } from '../api/products.js';
import { getCategories } from '../api/categories.js';

async function renderHome() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getFeaturedProducts()
  ]);

  const catContainer = document.querySelector('#category-tiles');
  catContainer.innerHTML = categories.map(c => `
    <a href="category.html?slug=${c.slug}" class="category-tile">
      <span>${c.name}</span>
    </a>
  `).join('');

  const productContainer = document.querySelector('#featured-products');
  productContainer.innerHTML = products.map(p => `
    <a href="product.html?slug=${p.slug}" class="product-card">
      <img src="${p.image_url ?? '/assets/images/placeholder.png'}" alt="${p.name}" loading="lazy">
      <h3>${p.name}</h3>
      <p class="price">₦${Number(p.price).toLocaleString()}</p>
    </a>
  `).join('');
}

renderHome();
```

Note: `loading="lazy"` on product images — cheap perf win, no extra tooling needed.

---

## 3. Category page (`category.html?slug=xxx`)

### Data fetch
```javascript
// js/api/products.js (add)
export async function getProductsByCategorySlug(categorySlug) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, image_url, categories!inner(slug)')
    .eq('is_active', true)
    .eq('categories.slug', categorySlug);
  if (error) throw error;
  return data;
}
```

### Page logic (`js/pages/category.js`)
```javascript
import { getProductsByCategorySlug } from '../api/products.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function renderCategory() {
  if (!slug) {
    document.querySelector('#category-grid').innerHTML = '<p>Category not found.</p>';
    return;
  }
  const products = await getProductsByCategorySlug(slug);
  // same card-rendering pattern as home.js — consider extracting to a shared helper
  // js/pages/shared/productCard.js -> renderProductCard(product)
}

renderCategory();
```

**Refactor tip:** extract the product-card HTML template into `js/pages/shared/productCard.js` now, since home, category, and search (later) all need identical cards. Avoids copy-pasted markup drifting out of sync.

---

## 4. Product detail page (`product.html?slug=xxx`)

### Data fetch — needs product + its variants + images
```javascript
// js/api/products.js (add)
export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, price, compare_at_price, stock, image_url,
      variants ( id, name, value, price_override, stock, sku ),
      product_images ( id, url, sort_order )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}
```

### Variant handling
Group variants by `name` (e.g. all "Size" rows) so the UI can render one selector per variant type:

```javascript
function groupVariants(variants) {
  return variants.reduce((acc, v) => {
    acc[v.name] = acc[v.name] || [];
    acc[v.name].push(v);
    return acc;
  }, {});
}
```

Render a `<select>` or button group per variant type. When a variant combo is selected, resolve to the specific `variants` row (for `price_override` and `stock`) — for simple single-axis variants (just "Size") this is a direct lookup; for multi-axis (Size + Color) you'll need a `sku` or composite key per combination, which is worth deciding on with the client now rather than after data entry starts.

**Recommendation:** if the client's catalog is mostly single-axis (just size, or just color), keep the schema as-is — much simpler. Only add complexity for true multi-axis products.

### Add to cart
```javascript
// js/api/cart.js — localStorage-backed for now
const CART_KEY = 'cart_v1';

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

export function addToCart(item) {
  // item: { productId, variantId, name, price, image, quantity }
  const cart = getCart();
  const existing = cart.find(i => i.productId === item.productId && i.variantId === item.variantId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function updateQuantity(productId, variantId, quantity) {
  const cart = getCart().map(i =>
    i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
  );
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function removeFromCart(productId, variantId) {
  const cart = getCart().filter(i => !(i.productId === productId && i.variantId === variantId));
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}
```

Stock check: before adding to cart, compare requested quantity against `stock` from the fetched product/variant — block if it would exceed available stock. This is a soft check (real enforcement happens server-side at checkout in Phase 5), but it prevents obviously bad UX now.

---

## 5. Cart page (`cart.html`)

- Read from `getCart()`, render line items (image, name, variant label, unit price, quantity input, remove button, line subtotal)
- Recalculate subtotal on every quantity change
- "Checkout" button — in this phase it can just be disabled/hidden or link to a "coming soon" state, since checkout is Phase 5
- Empty state: friendly message + link back to shop, not a blank page

```javascript
import { getCart, updateQuantity, removeFromCart } from '../api/cart.js';

function renderCart() {
  const cart = getCart();
  const container = document.querySelector('#cart-items');

  if (cart.length === 0) {
    container.innerHTML = '<p>Your cart is empty. <a href="index.html">Continue shopping</a></p>';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-line" data-product="${item.productId}" data-variant="${item.variantId ?? ''}">
      <img src="${item.image}" alt="${item.name}">
      <span>${item.name}</span>
      <input type="number" min="1" value="${item.quantity}" class="qty-input">
      <span>₦${(item.price * item.quantity).toLocaleString()}</span>
      <button class="remove-btn">Remove</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  document.querySelector('#cart-subtotal').textContent = `₦${subtotal.toLocaleString()}`;

  // wire up qty-input change and remove-btn click listeners here
}

renderCart();
```

---

## 6. Anime.js integration points (this phase)

Keep it purposeful, not decorative-for-its-own-sake:
- Hero section: subtle entrance animation on load
- Product cards: staggered fade/slide-in when the grid renders
- Add-to-cart: small pulse/feedback animation on the cart icon when an item is added
- Page transitions: optional, skip unless the client specifically wants it — easy to overdo and can hurt perceived performance if not careful

Keep anime.js calls in their own small functions (e.g. `js/animations.js`) rather than inline in page logic, so they're easy to strip out or adjust later without touching data-fetching code.

---

## 7. Files to create this phase

```
index.html
category.html
product.html
cart.html
css/main.css
js/api/products.js       (add getFeaturedProducts, getProductsByCategorySlug, getProductBySlug)
js/api/categories.js
js/api/cart.js
js/pages/home.js
js/pages/category.js
js/pages/product.js
js/pages/cart.js
js/pages/shared/productCard.js
js/animations.js
assets/images/placeholder.png
```

---

## 8. Verification checklist

1. Homepage loads categories and featured products from live Supabase data (not hardcoded)
2. Clicking a category tile lands on the correct filtered product grid
3. Clicking a product card opens the correct product detail page
4. Product page correctly displays variants (if any) and blocks add-to-cart when stock is 0
5. Add to cart → cart page reflects the item, correct quantity and subtotal
6. Quantity change and remove both update `localStorage` and re-render correctly
7. Refreshing the cart page preserves cart contents (proves localStorage persistence works)
8. All image `<img>` tags have `alt` text and `loading="lazy"`
9. No console errors on any of the four pages
10. Mobile viewport (375px width) doesn't break layout on any page

Once these pass, storefront is feature-complete for read-only browsing — Phase 3 (auth) is next.
