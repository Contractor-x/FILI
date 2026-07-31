# Phase 4 — Admin Panel

Goal: the client can log in and fully manage the product catalog — add, edit, delete products, manage stock/price, upload images, and manage variants — with zero code or database knowledge. This is the core deliverable of the whole project.

All pages here sit under `/admin/` and are gated by `requireAdmin()` from Phase 3.

---

## 1. Pages in scope

| Page | File | Purpose |
|---|---|---|
| Dashboard | `admin/index.html` | Table of all products, quick actions |
| Product editor | `admin/product-edit.html?id=xxx` (or no id = new) | Add/edit a single product + its variants + images |
| Categories | `admin/categories.html` | Simple CRUD for categories |

---

## 2. Dashboard (`admin/index.html`)

### Layout
- Table: image thumbnail, name, category, price, stock, active toggle, edit link, delete button
- "Add Product" button at top → links to `product-edit.html` with no `id`
- Search/filter box (client-side filter on the fetched list is fine for hundreds of products — no need for server-side search yet)
- Low-stock visual indicator (e.g. red text if `stock < 5`) — small but genuinely useful for the client day-to-day

### Data fetch (`js/api/products.js` — admin additions)
```javascript
// Admin needs ALL products, not just is_active — RLS already allows this for admin role
export async function getAllProductsAdmin() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active, image_url, categories(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleProductActive(id, isActive) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
```

### Page logic (`js/pages/admin-dashboard.js`)
```javascript
import { requireAdmin } from '../guards/requireAdmin.js';
await requireAdmin();

import { getAllProductsAdmin, toggleProductActive, deleteProduct } from '../api/products.js';

let allProducts = [];

async function renderDashboard() {
  allProducts = await getAllProductsAdmin();
  renderTable(allProducts);
}

function renderTable(products) {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td><img src="${p.image_url ?? '/assets/images/placeholder.png'}" width="48"></td>
      <td>${p.name}</td>
      <td>${p.categories?.name ?? '—'}</td>
      <td>₦${Number(p.price).toLocaleString()}</td>
      <td class="${p.stock < 5 ? 'low-stock' : ''}">${p.stock}</td>
      <td><input type="checkbox" class="active-toggle" ${p.is_active ? 'checked' : ''}></td>
      <td><a href="product-edit.html?id=${p.id}">Edit</a></td>
      <td><button class="delete-btn">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.active-toggle').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      await toggleProductActive(id, e.target.checked);
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const id = row.dataset.id;
      const name = row.querySelector('td:nth-child(2)').textContent;
      if (confirm(`Delete "${name}"? This cannot be undone.`)) {
        await deleteProduct(id);
        row.remove();
      }
    });
  });
}

document.querySelector('#search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderTable(allProducts.filter(p => p.name.toLowerCase().includes(q)));
});

renderDashboard();
```

**Delete vs deactivate:** consider whether "Delete" should be a real hard delete or just set `is_active = false`. If a product has ever been part of an order (`order_items` references it), hard-deleting breaks order history. Two options:
- **Recommended:** Delete button actually sets `is_active = false` and hides from storefront; add a separate "Permanently delete" only reachable after confirming, or restrict hard delete to products with zero order history via a check before the delete call.
- Simpler alternative: rename the button "Deactivate" instead of "Delete" to set expectations correctly, and don't offer hard delete in the UI at all — client rarely needs it, and it protects order history automatically.

Worth a quick decision with the client — flagged here rather than silently picked for you.

---

## 3. Product editor (`admin/product-edit.html?id=xxx`)

### Behavior
- No `id` in URL → "Add Product" mode, blank form
- `id` present → fetch existing product (including variants/images), pre-fill form, mode = "Edit"

### Form fields
- Name, slug (auto-generate from name, but allow manual override), description (textarea), price, compare-at price (optional), stock, category (dropdown from `categories`), is_active checkbox
- Image upload (single primary image for now; gallery via `product_images` if needed)
- Variants section: repeatable rows (name, value, price override, stock, sku) with an "Add variant" button

### Data fetch/save (`js/api/products.js` — add)
```javascript
export async function getProductForEdit(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*), product_images(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, product) {
  const { error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id);
  if (error) throw error;
}
```

```javascript
// js/api/variants.js
import { supabase } from '../supabaseClient.js';

export async function upsertVariants(productId, variants) {
  // variants without an id are new inserts; with an id are updates
  const rows = variants.map(v => ({ ...v, product_id: productId }));
  const { error } = await supabase.from('variants').upsert(rows);
  if (error) throw error;
}

export async function deleteVariant(id) {
  const { error } = await supabase.from('variants').delete().eq('id', id);
  if (error) throw error;
}
```

### Image upload wiring (uses `js/api/storage.js` from Phase 1 spec)
```javascript
document.querySelector('#image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadProductImage(file, currentProductId ?? 'temp-' + Date.now());
  document.querySelector('#image-preview').src = url;
  document.querySelector('#image_url_hidden').value = url;
});
```
Note: if this is a **new** product, you won't have a real `productId` yet for the storage path until after the first save. Simplest fix: save the product row first (even with a blank image), get back the generated `id`, then allow image upload — i.e. disable the image field until the product has been saved once, or save-on-blur before allowing upload. Flag this as a UX decision to make explicit in the form (e.g. "Save product details first, then add an image").

### Form submit logic (`js/pages/admin-product-edit.js`)
```javascript
import { requireAdmin } from '../guards/requireAdmin.js';
await requireAdmin();

import { getProductForEdit, createProduct, updateProduct } from '../api/products.js';
import { upsertVariants } from '../api/variants.js';

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

if (productId) {
  const product = await getProductForEdit(productId);
  populateForm(product); // fill inputs from fetched data
}

document.querySelector('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = collectFormData(); // { name, slug, description, price, stock, category_id, image_url, is_active }
  const variantRows = collectVariantRows(); // from the repeatable variant section

  try {
    let id = productId;
    if (id) {
      await updateProduct(id, formData);
    } else {
      const created = await createProduct(formData);
      id = created.id;
    }
    if (variantRows.length) {
      await upsertVariants(id, variantRows);
    }
    window.location.href = 'index.html';
  } catch (err) {
    document.querySelector('#error-message').textContent = err.message;
  }
});
```

### Slug auto-generation
```javascript
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

document.querySelector('#name-input').addEventListener('input', (e) => {
  const slugField = document.querySelector('#slug-input');
  if (!slugField.dataset.manuallyEdited) {
    slugField.value = slugify(e.target.value);
  }
});
document.querySelector('#slug-input').addEventListener('input', (e) => {
  e.target.dataset.manuallyEdited = 'true'; // stop auto-updating once user types their own
});
```

---

## 4. Categories page (`admin/categories.html`)

Simpler CRUD — no images/variants, just name + slug:
```javascript
// js/api/categories.js — admin additions
export async function createCategory(name, slug) {
  const { error } = await supabase.from('categories').insert({ name, slug });
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
```
Note: deleting a category currently sets `products.category_id` to `null` (per the `on delete set null` in the schema) rather than deleting products — confirm this is the desired behavior with the client, since silently orphaning products from their category might not be obvious to them.

---

## 5. Validation & guardrails (important for a non-technical client)

- Price and stock inputs: `type="number"`, `min="0"`, `step="0.01"` for price
- Block form submit if required fields are empty — inline error messages, not silent failure
- Confirm dialogs on every destructive action (delete product, delete variant, delete category)
- After save, show a visible success state (toast or banner) — don't just silently redirect, the client should get clear feedback their change worked
- Disable the submit button while a save is in-flight, to prevent double-submit on slow connections

---

## 6. Files to create this phase

```
admin/index.html
admin/product-edit.html
admin/categories.html
admin/admin.css
js/pages/admin-dashboard.js
js/pages/admin-product-edit.js
js/pages/admin-categories.js
js/api/products.js       (admin additions: getAllProductsAdmin, createProduct, updateProduct, deleteProduct, toggleProductActive, getProductForEdit)
js/api/variants.js
js/api/storage.js        (from Phase 1 spec — uploadProductImage)
```

---

## 7. Verification checklist

1. Logged in as admin, dashboard loads **all** products (including inactive ones) — confirms admin RLS bypass works
2. Logged in as a non-admin (or logged out), directly visiting `/admin/index.html` redirects away — even via typed URL, not just hidden nav link
3. Adding a new product with all fields filled correctly creates a row, visible on the dashboard immediately
4. Editing an existing product's price/stock and saving reflects instantly in the storefront's product page (test in a separate tab)
5. Deleting (or deactivating, per the decision made in section 2) a product removes/hides it from the public storefront
6. Image upload works, preview updates, and the uploaded image actually appears on the public product page
7. Adding a variant (e.g. Size: Large) on a product shows up correctly on the storefront's variant selector
8. Search/filter box on the dashboard correctly narrows the product list without page reload
9. Low-stock indicator visibly flags products under the threshold
10. Attempting the same write actions (create/update/delete) via direct Supabase calls as a non-admin user fails — reconfirms RLS is the real backstop, not just this UI

Once these pass, the client has a fully working catalog management system — this is a strong milestone to demo before starting Phase 5 (checkout/payments).
