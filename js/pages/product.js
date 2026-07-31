import { getProductBySlug } from '../api/products.js';
import { addToCart, getCartCount } from '../api/cart.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { animateAddToCart } from '../animations.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

function groupVariants(variants) {
  return variants.reduce((acc, v) => {
    acc[v.name] = acc[v.name] || [];
    acc[v.name].push(v);
    return acc;
  }, {});
}

function renderProductDetail(product) {
  const container = document.querySelector('#product-detail');

  const grouped = product.variants?.length ? groupVariants(product.variants) : {};
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  let html = `
    <div class="product-detail-image">
      <img src="${product.image_url ?? '/assets/images/placeholder.png'}" alt="${product.name}" />
      ${product.product_images?.length ? `
        <div class="product-gallery">
          ${product.product_images.map(pi => `<img src="${pi.url}" alt="${product.name}" />`).join('')}
        </div>
      ` : ''}
    </div>
    <div class="product-detail-info">
      <h1>${product.name}</h1>
      <p class="price ${hasDiscount ? 'has-discount' : ''}">
        ₦${Number(product.price).toLocaleString()}
        ${hasDiscount ? `<span class="compare-price">₦${Number(product.compare_at_price).toLocaleString()}</span>` : ''}
      </p>
      <p class="description">${product.description ?? ''}</p>
  `;

  for (const [groupName, options] of Object.entries(grouped)) {
    html += `
      <div class="variant-group">
        <label>${groupName}</label>
        <select class="variant-select" data-group="${groupName}">
          <option value="">Select ${groupName}</option>
          ${options.map(v => `
            <option value="${v.id}" data-price="${v.price_override ?? ''}" data-stock="${v.stock}">
              ${v.value} ${v.sku ? `(${v.sku})` : ''}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  html += `
      <div class="add-to-cart-row">
        <input type="number" id="qty-input" value="1" min="1" max="${product.stock}" />
        <button id="add-to-cart-btn" class="buy-btn" data-product-id="${product.id}">Add to Cart</button>
      </div>
      <p id="stock-info" class="stock-info">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
    </div>
  `;

  container.innerHTML = html;

  if (product.stock <= 0) {
    document.getElementById('add-to-cart-btn').disabled = true;
  }

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    const qty = parseInt(document.getElementById('qty-input').value) || 1;
    if (qty > product.stock) {
      alert('Not enough stock available.');
      return;
    }

    let variantId = null;
    const variantGroups = Object.keys(grouped);
    if (variantGroups.length) {
      const selects = document.querySelectorAll('.variant-select');
      const selections = Array.from(selects).map(s => s.value).filter(Boolean);
      if (selections.length !== variantGroups.length) {
        alert('Please select all variant options.');
        return;
      }
      variantId = selections[0];
    }

    addToCart({
      productId: product.id,
      variantId,
      name: product.name,
      price: Number(product.price),
      image: product.image_url ?? '/assets/images/placeholder.png',
      quantity: qty,
    });

    document.getElementById('cart-count').textContent = getCartCount();
    animateAddToCart(document.getElementById('add-to-cart-btn'));
  });
}

async function renderProduct() {
  const container = document.querySelector('#product-detail');

  if (!slug) {
    container.innerHTML = '<p>Product not found.</p>';
    return;
  }

  try {
    const product = await getProductBySlug(slug);
    if (!product) {
      container.innerHTML = '<p>Product not found.</p>';
      return;
    }
    renderProductDetail(product);
  } catch {
    container.innerHTML = '<p>Failed to load product.</p>';
  }
}

renderProduct();
