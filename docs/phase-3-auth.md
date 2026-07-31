# Phase 3 — Auth

Goal: customers can sign up / log in with email+password or Google, sessions persist across pages, and admin routes are gated by role. No admin UI yet (that's Phase 4) — just the auth plumbing and route guarding.

---

## 1. Pages in scope

| Page | File | Purpose |
|---|---|---|
| Login | `login.html` | Email/password + Google OAuth login |
| Sign up | `signup.html` | Email/password registration |
| Account (optional, minimal) | `account.html` | Shows logged-in user, logout button, order history placeholder |

Admin login reuses the same `login.html` — there's no separate "admin login page." After login, the app checks the user's role and routes accordingly.

---

## 2. Supabase dashboard setup (one-time, no code)

1. **Authentication → Providers**: enable Email, enable Google
   - For Google: create OAuth credentials in Google Cloud Console, add the Client ID/Secret into Supabase, and add your site's URL(s) to Google's authorized redirect URIs (`https://<project-ref>.supabase.co/auth/v1/callback` plus your Vercel domain)
2. **Authentication → URL Configuration**: set Site URL to your production Vercel domain, add `localhost` (with your dev port) to Redirect URLs for local testing
3. **Authentication → Email Templates**: customize confirmation/reset emails if the client wants branding here (optional, can defer)

---

## 3. Core auth module (`js/api/auth.js`)

```javascript
import { supabase } from '../supabaseClient.js';

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/login.html';
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUserWithRole() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;
  return { ...session.user, ...data };
}
```

---

## 4. Login page logic (`js/pages/login.js`)

```javascript
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
```

---

## 5. Sign up page logic (`js/pages/signup.js`)

```javascript
import { signUp } from '../api/auth.js';

document.querySelector('#signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.querySelector('#fullName').value;
  const email = document.querySelector('#email').value;
  const password = document.querySelector('#password').value;
  const errorEl = document.querySelector('#error-message');

  try {
    await signUp(email, password, fullName);
    // If email confirmation is on (default), tell them to check inbox
    document.querySelector('#signup-form').hidden = true;
    document.querySelector('#confirm-message').hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});
```

Decide now: leave **email confirmation on** (Supabase default) for a real client site — reduces fake signups, minor UX cost. Turn it off only for faster dev testing, then re-enable before launch.

---

## 6. Route guarding

Two levels of protection needed:

### a) Customer-only pages (e.g. `account.html`)
```javascript
// js/guards/requireAuth.js
import { getSession } from '../api/auth.js';

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
  }
  return session;
}
```
Call at the top of any page's script: `await requireAuth();` before rendering anything sensitive.

### b) Admin-only pages (all of `admin/*.html`)
```javascript
// js/guards/requireAdmin.js
import { getCurrentUserWithRole } from '../api/auth.js';

export async function requireAdmin() {
  const user = await getCurrentUserWithRole();
  if (!user || user.role !== 'admin') {
    window.location.href = '/login.html';
    throw new Error('Not authorized'); // stop further script execution
  }
  return user;
}
```
Every file in `admin/` starts its page script with:
```javascript
import { requireAdmin } from '../js/guards/requireAdmin.js';
await requireAdmin();
// ... rest of admin page logic only runs if this resolves
```

**Important:** this guard is a UX/convenience layer, not the real security boundary — RLS on the `products` table is what actually stops a non-admin from writing data even if they bypass the frontend guard (e.g. via devtools console calling Supabase directly). Both layers matter: guard for good UX, RLS for actual security.

---

## 7. Nav bar auth state

Every page's shared header should reflect login state — show "Login" vs "Account / Logout" vs "Admin Dashboard" link:

```javascript
// js/components/navAuthState.js
import { getCurrentUserWithRole } from '../api/auth.js';
import { signOut } from '../api/auth.js';

export async function renderNavAuthState() {
  const user = await getCurrentUserWithRole();
  const navSlot = document.querySelector('#nav-auth-slot');

  if (!user) {
    navSlot.innerHTML = `<a href="/login.html">Login</a>`;
    return;
  }

  navSlot.innerHTML = `
    <a href="/account.html">${user.full_name ?? 'Account'}</a>
    ${user.role === 'admin' ? '<a href="/admin/index.html">Admin</a>' : ''}
    <button id="logout-btn">Logout</button>
  `;

  document.querySelector('#logout-btn').addEventListener('click', signOut);
}
```
Call `renderNavAuthState()` on every page that includes the shared nav.

---

## 8. Files to create this phase

```
login.html
signup.html
account.html
js/api/auth.js
js/pages/login.js
js/pages/signup.js
js/pages/account.js
js/guards/requireAuth.js
js/guards/requireAdmin.js
js/components/navAuthState.js
```

---

## 9. Verification checklist

1. Sign up with email/password creates a Supabase auth user **and** a matching `profiles` row with `role = 'customer'`
2. Login with correct credentials redirects to homepage; wrong password shows an inline error, not a console error
3. Google OAuth login works end-to-end and also produces a `profiles` row on first login
4. Manually set a test user's `role` to `'admin'` in Supabase — logging in with that user redirects to `/admin/index.html`
5. Visiting `/admin/index.html` while logged out redirects to `/login.html`
6. Visiting `/admin/index.html` while logged in as a non-admin redirects to `/login.html` (not just hides content — actually redirects)
7. Nav bar correctly shows Login vs Account/Admin/Logout depending on session state, on every page
8. Logout clears the session and nav reverts to "Login" on next page load
9. Refreshing any page preserves the session (Supabase persists it in localStorage under the hood — confirm no unexpected logout on refresh)
10. In Supabase SQL editor, confirm a non-admin JWT still gets rejected on `insert`/`update`/`delete` against `products` even if called directly (bypassing your frontend guard) — this proves RLS, not just the UI guard, is doing the real enforcement

Once these pass, move to Phase 4 (admin panel), which builds on top of `requireAdmin.js`.
