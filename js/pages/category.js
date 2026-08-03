import '../components/customCursor.js';
import { getProductsByCategorySlug, subscribeToProductChanges } from '../api/products.js';
import { getCartCount } from '../api/cart.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { renderProductCard } from './shared/productCard.js';
import { animateCards } from '../animations.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function renderCategory() {
  const title = document.querySelector('#category-title');
  const container = document.querySelector('#category-grid');

  if (!slug) {
    container.innerHTML = '<p>Category not found.</p>';
    return;
  }

  title.textContent = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  try {
    const products = await getProductsByCategorySlug(slug);
    if (products.length === 0) {
      container.innerHTML = '<p>No products in this category yet.</p>';
      return;
    }
    container.innerHTML = products.map(renderProductCard).join('');
    animateCards('.product-card');
  } catch {
    container.innerHTML = '<p>Failed to load products.</p>';
  }
}

renderCategory();
subscribeToProductChanges(() => renderCategory(), ['products', 'categories']);
