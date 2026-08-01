import { getSession } from '../api/auth.js';

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
  }
  return session;
}
