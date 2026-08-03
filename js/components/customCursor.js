const finePointer = window.matchMedia('(any-pointer: fine)');

if (finePointer.matches && !document.body.classList.contains('custom-cursor')) {
  document.body.classList.add('custom-cursor');
}
