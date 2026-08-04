import { requireAuth } from '../guards/requireAuth.js';
import '../components/customCursor.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { getProfile, updateProfile, changePassword } from '../api/profile.js';
import { showToast } from '../components/toast.js';

await requireAuth();
renderNavAuthState();

async function renderAccount() {
  const profile = await getProfile();
  if (!profile) return;

  document.querySelector('#email-display').textContent = profile.email;
  document.querySelector('#full_name').value = profile.full_name ?? '';
  document.querySelector('#phone').value = profile.phone ?? '';
  document.querySelector('#address_line1').value = profile.address_line1 ?? '';
  document.querySelector('#address_line2').value = profile.address_line2 ?? '';
  document.querySelector('#city').value = profile.city ?? '';
  document.querySelector('#state').value = profile.state ?? '';
  document.querySelector('#country').value = profile.country ?? 'Nigeria';
}

document.querySelector('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const updates = {
    full_name: document.querySelector('#full_name').value,
    phone: document.querySelector('#phone').value,
    address_line1: document.querySelector('#address_line1').value,
    address_line2: document.querySelector('#address_line2').value,
    city: document.querySelector('#city').value,
    state: document.querySelector('#state').value,
    country: document.querySelector('#country').value,
  };

  const btn = document.querySelector('#save-btn');
  btn.disabled = true;
  try {
    await updateProfile(updates);
    showToast('Profile updated');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

document.querySelector('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.querySelector('#new_password').value;
  const confirm = document.querySelector('#confirm_password').value;

  if (newPassword !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  if (newPassword.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  try {
    await changePassword(newPassword);
    showToast('Password changed');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

renderAccount();
