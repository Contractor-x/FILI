import { signUp } from '../api/auth.js';

document.querySelector('#signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.querySelector('#fullName').value;
  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;
  const errorEl = document.querySelector('#error-message');

  try {
    await signUp(email, password, fullName);
    document.querySelector('#signup-form').hidden = true;
    document.querySelector('#confirm-message').hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});
