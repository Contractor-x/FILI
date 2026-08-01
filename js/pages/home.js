import { getCartCount } from '../api/cart.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { animateHomeGrid } from '../animations.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

document.querySelectorAll('#grid-top .box, #grid-bottom .box').forEach(box => {
  box.style.opacity = '0';
});

animateHomeGrid();
