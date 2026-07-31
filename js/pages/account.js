import { requireAuth } from '../guards/requireAuth.js';
import { getCurrentUserWithRole } from '../api/auth.js';
import { renderNavAuthState } from '../components/navAuthState.js';

await requireAuth();
renderNavAuthState();

const user = await getCurrentUserWithRole();
const container = document.querySelector('#account-info');

container.innerHTML = `
  <p><strong>Name:</strong> ${user.full_name ?? '—'}</p>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>Role:</strong> ${user.role}</p>
`;
