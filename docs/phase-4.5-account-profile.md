# Phase 4.5 — Customer Account / Profile

Goal: a logged-in customer can view and edit their own profile info (name, phone, address) ahead of checkout existing. Order history section is scaffolded but stays empty until Phase 5 wires up real orders. This sits between Phase 4 (admin panel) and Phase 5 (checkout).

---

## 1. Schema addition

`profiles` currently only has `full_name` and `role`. Add fields customers will want to manage and that checkout will need later:

```sql
alter table profiles
  add column phone text,
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column state text,
  add column country text default 'Nigeria';
```

No RLS changes needed — the existing "Own profile update" policy from Phase 1 already covers these new columns (`auth.uid() = id`).

---

## 2. Page in scope

| Page | File | Purpose |
|---|---|---|
| Account | `account.html` | View/edit profile fields, change password, order history (empty state), logout |

---

## 3. Data fetch/update (`js/api/profile.js`)

```javascript
import { supabase } from '../supabaseClient.js';

export async function getProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) throw error;
  return { ...data, email: session.user.email };
}

export async function updateProfile(updates) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', session.user.id);
  if (error) throw error;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
```

Note: `email` isn't editable here — changing email requires Supabase's email-change confirmation flow (`supabase.auth.updateUser({ email })`, which sends a confirmation link). Worth adding later if the client needs it; skip for now to keep this phase small.

---

## 4. Page logic (`js/pages/account.js`)

```javascript
import { requireAuth } from '../guards/requireAuth.js';
await requireAuth();

import { getProfile, updateProfile, changePassword } from '../api/profile.js';

async function renderAccount() {
  const profile = await getProfile();

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
```

Simple toast helper, reusable across the site:
```javascript
// js/components/toast.js
export function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
```

---

## 5. Order history section (scaffold only)

Add the section to `account.html` now so the layout is in place, but it just shows an empty state until Phase 5:

```html
<section id="order-history">
  <h2>Order History</h2>
  <div id="orders-list">
    <p>You haven't placed any orders yet.</p>
  </div>
</section>
```

In Phase 5, this gets replaced with a real fetch against `orders`/`order_items` filtered by `user_id = auth.uid()` (already covered by the RLS policy from Phase 1) — no schema or policy changes needed then, just the fetch + render logic.

---

## 6. Files to create this phase

```
account.html
js/api/profile.js
js/pages/account.js
js/components/toast.js
sql/004_profile_fields.sql   (the alter table statement above)
```

---

## 7. Verification checklist

1. Logged-out visit to `account.html` redirects to `login.html` (via `requireAuth`)
2. Logged-in customer sees their own email (read-only) and current profile fields pre-filled
3. Editing name/phone/address and saving persists — confirmed by refreshing the page and seeing the saved values
4. Attempting to fetch another user's profile via direct Supabase call (different `id`) fails — confirms RLS still restricts to own row
5. Password change form validates matching + minimum length client-side, and actually updates the password (test by logging out and back in with the new password)
6. Toast feedback appears on both successful and failed saves
7. Order history section renders its empty state cleanly, no console errors from a missing/empty `orders` table
8. Mobile viewport doesn't break the form layout

Once these pass, move to Phase 5 (checkout + payments), which will replace the order-history empty state with real data.
