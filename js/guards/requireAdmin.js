import { getCurrentUserWithRole } from '../api/auth.js';

export async function requireAdmin() {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
    throw new Error('Not authorized');
  }
  return user;
}
