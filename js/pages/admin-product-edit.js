import { requireAdmin } from '../guards/requireAdmin.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { getProductForEdit, createProduct, updateProduct } from '../api/products.js';
import { getCategories } from '../api/categories.js';
import { upsertVariants, deleteVariant } from '../api/variants.js';
import { uploadProductImage } from '../api/storage.js';

await requireAdmin();
renderNavAuthState();

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');
const removedVariantIds = new Set();
let currentProductId = productId;

const form = document.querySelector('#product-form');
const errorMsg = document.querySelector('#error-message');
const saveBtn = document.querySelector('#save-btn');
const variantsWrap = document.querySelector('#variants-wrap');
const imageInput = document.querySelector('#image-input');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

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
  e.target.dataset.manuallyEdited = 'true';
});

function variantRowHTML(v = {}) {
  return `
    <div class="variant-row" data-id="${v.id ?? ''}">
      <input class="v-name" placeholder="Size" value="${v.name ?? ''}" />
      <input class="v-value" placeholder="Large" value="${v.value ?? ''}" />
      <input class="v-price" type="number" min="0" step="0.01" placeholder="Price override" value="${v.price_override ?? ''}" />
      <input class="v-stock" type="number" min="0" step="1" placeholder="Stock" value="${v.stock ?? 0}" />
      <input class="v-sku" placeholder="SKU" value="${v.sku ?? ''}" />
      <button type="button" class="btn btn-danger btn-sm v-remove">Remove</button>
    </div>
  `;
}

function addVariantRow(v = {}) {
  variantsWrap.insertAdjacentHTML('beforeend', variantRowHTML(v));
  bindVariantRow(variantsWrap.lastElementChild);
}

function bindVariantRow(row) {
  row.querySelector('.v-remove').addEventListener('click', () => {
    if (row.dataset.id) removedVariantIds.add(row.dataset.id);
    row.remove();
  });
}

function collectVariantRows() {
  return Array.from(variantsWrap.querySelectorAll('.variant-row'))
    .filter(row => row.querySelector('.v-name').value.trim() || row.querySelector('.v-value').value.trim())
    .map(row => ({
      id: row.dataset.id || undefined,
      name: row.querySelector('.v-name').value.trim(),
      value: row.querySelector('.v-value').value.trim(),
      price_override: row.querySelector('.v-price').value === '' ? null : Number(row.querySelector('.v-price').value),
      stock: Number(row.querySelector('.v-stock').value) || 0,
      sku: row.querySelector('.v-sku').value.trim() || null,
    }));
}

function populateForm(product) {
  document.querySelector('#page-title').textContent = 'Edit Product';
  document.querySelector('#name-input').value = product.name || '';
  document.querySelector('#slug-input').value = product.slug || '';
  document.querySelector('#description-input').value = product.description || '';
  document.querySelector('#price-input').value = product.price ?? '';
  document.querySelector('#compare-input').value = product.compare_at_price ?? '';
  document.querySelector('#stock-input').value = product.stock ?? 0;
  document.querySelector('#category-input').value = product.category_id ?? '';
  document.querySelector('#active-input').checked = product.is_active !== false;
  document.querySelector('#image-preview').src = product.image_url || '/assets/images/placeholder.png';
  document.querySelector('#image_url_hidden').value = product.image_url || '';

  (product.variants || []).forEach(v => addVariantRow(v));
}

async function init() {
  document.querySelector('#add-variant-btn').addEventListener('click', () => addVariantRow());

  try {
    const categories = await getCategories();
    const select = document.querySelector('#category-input');
    select.innerHTML = '<option value="">— None —</option>' +
      categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (productId) {
      const product = await getProductForEdit(productId);
      populateForm(product);
    } else {
      document.querySelector('#image-note').textContent = 'Save the product first, then add an image.';
      imageInput.disabled = true;
    }
  } catch (err) {
    errorMsg.textContent = err.message;
  }
}

imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  imageInput.disabled = true;
  try {
    const url = await uploadProductImage(file, currentProductId);
    document.querySelector('#image-preview').src = url;
    document.querySelector('#image_url_hidden').value = url;
    showToast('Image uploaded');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    imageInput.disabled = false;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const name = document.querySelector('#name-input').value.trim();
  const price = document.querySelector('#price-input').value;
  if (!name) {
    errorMsg.textContent = 'Product name is required.';
    document.querySelector('#name-input').focus();
    return;
  }
  if (price === '' || Number(price) < 0) {
    errorMsg.textContent = 'Enter a valid price (0 or more).';
    document.querySelector('#price-input').focus();
    return;
  }

  const formData = {
    name,
    slug: document.querySelector('#slug-input').value.trim() || slugify(name),
    description: document.querySelector('#description-input').value.trim(),
    price: Number(price),
    compare_at_price: document.querySelector('#compare-input').value === '' ? null : Number(document.querySelector('#compare-input').value),
    stock: Number(document.querySelector('#stock-input').value) || 0,
    category_id: document.querySelector('#category-input').value || null,
    image_url: document.querySelector('#image_url_hidden').value || null,
    is_active: document.querySelector('#active-input').checked,
  };

  const variantRows = collectVariantRows();

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    let id = currentProductId;
    if (id) {
      await updateProduct(id, formData);
    } else {
      const created = await createProduct(formData);
      id = created.id;
      currentProductId = id;
      imageInput.disabled = false;
      document.querySelector('#image-note').textContent = '';
    }

    await upsertVariants(id, variantRows);

    for (const vid of removedVariantIds) {
      await deleteVariant(vid);
    }

    showToast('Product saved');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
  } catch (err) {
    showToast(err.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
});

init();
