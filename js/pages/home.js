import { getCartCount } from '../api/cart.js';
import '../components/customCursor.js';
import { getFeaturedProducts, subscribeToProductChanges } from '../api/products.js';
import { isLocalPreview, localProducts } from '../api/localCatalog.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { animateHomeGrid, animateWatermark } from '../animations.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

const grid = document.getElementById('products-grid');

function boxHTML(p) {
  return `
    <a href="product.html?slug=${p.slug}" class="box">
      <img src="${p.image_url || '/assets/images/placeholder.png'}" alt="${p.name}" loading="lazy" />
      <div class="overlay">
        <h3>${p.name}</h3>
        <p>₦${Number(p.price).toLocaleString()}</p>
      </div>
    </a>
  `;
}

function renderProducts(products, animate = false) {
  if (!products.length) {
    grid.innerHTML = '<p id="grid-status">No products yet. Check back soon.</p>';
    return;
  }

  grid.innerHTML = products.map(boxHTML).join('');

  if (animate) {
    document.querySelectorAll('.grid .box').forEach(box => {
      box.style.opacity = '0';
    });
    animateHomeGrid();
  }
}

async function load() {
  try {
    const products = await getFeaturedProducts(10);
    if (products && products.length) return products;
  } catch {
    /* fall through to local catalog */
  }
  return localProducts;
}

async function refresh() {
  renderProducts(await load(), false);
}

async function init() {
  if (isLocalPreview) {
    renderProducts(localProducts, true);
    return;
  }
  renderProducts(await load(), true);
  subscribeToProductChanges(() => refresh());
}

animateWatermark();
init();
