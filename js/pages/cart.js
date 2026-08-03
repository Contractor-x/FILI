import { getCart, updateQuantity, removeFromCart, getCartCount } from '../api/cart.js';
import '../components/customCursor.js';
import { renderNavAuthState } from '../components/navAuthState.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

function renderCart() {
  const cart = getCart();
  const container = document.querySelector('#cart-items');
  const subtotalEl = document.querySelector('#cart-subtotal');

  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-cart">Your cart is empty. <a href="index.html">Continue shopping</a></p>';
    document.querySelector('.cart-summary').style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-line" data-product="${item.productId}" data-variant="${item.variantId ?? ''}">
      <img src="${item.image}" alt="${item.name}" class="cart-line-image" />
      <div class="cart-line-info">
        <span class="cart-line-name">${item.name}</span>
        <span class="cart-line-price">₦${Number(item.price).toLocaleString()}</span>
      </div>
      <input type="number" min="1" value="${item.quantity}" class="qty-input" />
      <span class="cart-line-subtotal">₦${(item.price * item.quantity).toLocaleString()}</span>
      <button class="remove-btn">Remove</button>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;

  container.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const line = input.closest('.cart-line');
      const productId = line.dataset.product;
      const variantId = line.dataset.variant || null;
      const qty = parseInt(input.value) || 1;
      updateQuantity(productId, variantId, qty);
      renderCart();
      document.getElementById('cart-count').textContent = getCartCount();
    });
  });

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const line = btn.closest('.cart-line');
      const productId = line.dataset.product;
      const variantId = line.dataset.variant || null;
      removeFromCart(productId, variantId);
      renderCart();
      document.getElementById('cart-count').textContent = getCartCount();
    });
  });
}

renderCart();
