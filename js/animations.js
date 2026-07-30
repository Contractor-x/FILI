import anime from 'https://cdn.jsdelivr.net/npm/animejs@3/+esm';

export function animateHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  anime({
    targets: '.hero-content',
    translateY: [40, 0],
    opacity: [0, 1],
    easing: 'easeOutQuad',
    duration: 800,
  });
}

export function animateCards(selector) {
  anime({
    targets: selector,
    translateY: [30, 0],
    opacity: [0, 1],
    delay: anime.stagger(80),
    easing: 'easeOutQuad',
    duration: 500,
  });
}

export function animateAddToCart(btn) {
  anime({
    targets: btn,
    scale: [1, 1.1, 1],
    duration: 300,
    easing: 'easeInOutQuad',
  });

  const badge = document.getElementById('cart-count');
  anime({
    targets: badge,
    scale: [1, 1.4, 1],
    duration: 400,
    easing: 'easeInOutQuad',
  });
}
