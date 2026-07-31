import { getCurrentUserWithRole, signOut } from '../api/auth.js';

export async function renderNavAuthState() {
  const navSlot = document.querySelector('#nav-auth-slot');
  if (!navSlot) return;

  let user;
  try {
    user = await getCurrentUserWithRole();
  } catch {
    user = null;
  }

  if (!user) {
    navSlot.innerHTML = `<a href="/login.html" class="nav-link">Login</a>`;
    return;
  }

  navSlot.innerHTML = `
    <a href="/account.html" class="nav-link">${user.full_name ?? 'Account'}</a>
    ${user.role === 'admin' ? '<a href="/admin/index.html" class="nav-link">Admin</a>' : ''}
    <button id="logout-btn" class="nav-logout">Logout</button>
  `;

  document.querySelector('#logout-btn').addEventListener('click', signOut);
}
