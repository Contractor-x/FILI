import { animate, stagger } from 'animejs';

export function animateHero() {
  const hero = document.querySelector('.hero-content');
  if (!hero) return;
  animate(hero, {
    translateY: [40, 0],
    opacity: [0, 1],
    ease: 'outQuad',
    duration: 800,
  });
}

export function animateCards(selector) {
  animate(selector, {
    translateY: [30, 0],
    opacity: [0, 1],
    delay: stagger(80),
    ease: 'outQuad',
    duration: 500,
  });
}

export function animateAddToCart(btn) {
  animate(btn, {
    scale: [1, 1.1, 1],
    duration: 300,
    ease: 'inOutQuad',
  });

  const badge = document.getElementById('cart-count');
  animate(badge, {
    scale: [1, 1.4, 1],
    duration: 400,
    ease: 'inOutQuad',
  });
}

export function animateHomeGrid() {
  const boxes = Array.from(document.querySelectorAll('.grid .box'));
  if (!boxes.length) return;

  const topRow = boxes.slice(0, 5);
  const bottomRow = boxes.slice(5);

  if (topRow.length) {
    animate(topRow, {
      translateX: ['100%', '0%'],
      opacity: [0, 1],
      delay: stagger(60),
      ease: 'outExpo',
      duration: 900,
    });
  }

  if (bottomRow.length) {
    animate(bottomRow, {
      translateX: ['-100%', '0%'],
      opacity: [0, 1],
      delay: stagger(60, { from: 'last' }),
      ease: 'outExpo',
      duration: 900,
    });
  }
}

const DRIFT_NAMES = ['driftA', 'driftB', 'driftC'];

export function animateWatermark() {
  const logos = document.querySelectorAll('.watermark .scatter');
  logos.forEach((logo) => {
    const duration = 6 + Math.random() * 8;
    logo.style.animationName = DRIFT_NAMES[Math.floor(Math.random() * DRIFT_NAMES.length)];
    logo.style.animationDuration = `${duration.toFixed(2)}s`;
    logo.style.animationDelay = `-${(Math.random() * duration).toFixed(2)}s`;
  });
}
