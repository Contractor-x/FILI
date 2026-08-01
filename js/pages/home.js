import { getCartCount } from '../api/cart.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { animateHomeGrid, animateWatermark } from '../animations.js';

document.getElementById('cart-count').textContent = getCartCount();
renderNavAuthState();

document.querySelectorAll('.grid .box').forEach(box => {
  box.style.opacity = '0';
});

animateHomeGrid();
animateWatermark();
