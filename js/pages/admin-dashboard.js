import { requireAdmin } from '../guards/requireAdmin.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { getAllProductsAdmin, toggleProductActive, deleteProduct } from '../api/products.js';

await requireAdmin();
renderNavAuthState();

let allProducts = [];

const tbody = document.querySelector('#products-table tbody');

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

function renderTable(products) {
  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td><img src="${p.image_url || '/assets/images/placeholder.png'}" alt="" /></td>
      <td class="${p.is_active ? '' : 'inactive'}">${p.name}</td>
      <td>${p.categories?.name ?? '—'}</td>
      <td>₦${Number(p.price).toLocaleString()}</td>
      <td class="${p.stock < 5 ? 'low-stock' : ''}">${p.stock}</td>
      <td><input type="checkbox" class="active-toggle" ${p.is_active ? 'checked' : ''} /></td>
      <td>
        <div class="row-actions">
          <a href="product-edit.html?id=${p.id}">Edit</a>
          <button class="btn btn-outline btn-sm delete-btn">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.active-toggle').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.closest('tr').dataset.id;
      const name = e.target.closest('tr').querySelector('td:nth-child(2)').textContent.trim();
      try {
        await toggleProductActive(id, e.target.checked);
        e.target.closest('tr').querySelector('td:nth-child(2)').classList.toggle('inactive', !e.target.checked);
        showToast(e.target.checked ? `"${name}" is now visible on the storefront` : `"${name}" hidden from storefront`);
      } catch (err) {
        showToast(err.message, 'error');
        e.target.checked = !e.target.checked;
      }
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const id = row.dataset.id;
      const name = row.querySelector('td:nth-child(2)').textContent.trim();
      if (!confirm(`Deactivate "${name}"? It will be hidden from the storefront. This does not delete its order history.`)) return;
      btn.disabled = true;
      try {
        await deleteProduct(id);
        row.remove();
        showToast(`"${name}" deactivated`);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });
}

document.querySelector('#search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderTable(allProducts.filter(p => p.name.toLowerCase().includes(q)));
});

async function init() {
  try {
    allProducts = await getAllProductsAdmin();
    renderTable(allProducts);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

init();
