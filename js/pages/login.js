import { signIn, signInWithGoogle, getCurrentUserWithRole } from '../api/auth.js';

document.querySelector('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;
  const errorEl = document.querySelector('#error-message');

  try {
    await signIn(email, password);
    const user = await getCurrentUserWithRole();
    window.location.href = user.role === 'admin' ? '/admin/index.html' : '/index.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

document.querySelector('#google-login-btn').addEventListener('click', () => {
  signInWithGoogle();
});
