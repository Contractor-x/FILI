const CURSOR_URL = '/assets/images/fili-cursor.png';

function applyCustomCursor() {
  const root = document.documentElement;
  const body = document.body;
  const cursor = `url('${CURSOR_URL}') 16 16, auto`;

  root.classList.add('custom-cursor');
  body.classList.add('custom-cursor');

  root.style.setProperty('cursor', cursor, 'important');
  body.style.setProperty('cursor', cursor, 'important');
}

applyCustomCursor();
