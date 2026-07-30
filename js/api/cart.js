const CART_KEY = 'cart_v1';

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

export function addToCart(item) {
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

export function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}
