import { getCartCount } from '../api/cart.js';

document.getElementById('cart-count').textContent = getCartCount();
