import { getCartCount } from '../api/cart.js';
import { renderNavAuthState } from '../components/navAuthState.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();
