import { requireAdmin } from '../guards/requireAdmin.js';
import { renderNavAuthState } from '../components/navAuthState.js';
import { getCategoriesWithCounts, createCategory, updateCategory, deleteCategory } from '../api/categories.js';

await requireAdmin();
renderNavAuthState();

const tbody = document.querySelector('#categories-table tbody');
const errorMsg = document.querySelector('#error-message');
const saveBtn = document.querySelector('#save-cat-btn');

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

document.querySelector('#cat-name').addEventListener('input', (e) => {
  const slugField = document.querySelector('#cat-slug');
  if (!slugField.dataset.manuallyEdited) {
    slugField.value = slugify(e.target.value);
  }
});

document.querySelector('#cat-slug').addEventListener('input', (e) => {
  e.target.dataset.manuallyEdited = 'true';
});

function resetForm() {
  document.querySelector('#category-form').reset();
  document.querySelector('#cat-slug').dataset.manuallyEdited = '';
  document.querySelector('#add-title').textContent = 'Add Category';
  saveBtn.textContent = 'Add Category';
  document.querySelector('#category-form').dataset.editId = '';
}

function renderTable(categories) {
  tbody.innerHTML = categories.map(c => `
    <tr data-id="${c.id}">
      <td class="cat-name">${c.name}</td>
      <td class="cat-slug">${c.slug}</td>
      <td><span class="count">${c.products?.[0]?.count ?? 0}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm edit-btn">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      document.querySelector('#cat-name').value = row.querySelector('.cat-name').textContent;
      document.querySelector('#cat-slug').value = row.querySelector('.cat-slug').textContent;
      document.querySelector('#add-title').textContent = 'Edit Category';
      saveBtn.textContent = 'Save Changes';
      document.querySelector('#category-form').dataset.editId = row.dataset.id;
    });
  });

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const name = row.querySelector('.cat-name').textContent;
      if (!confirm(`Delete category "${name}"? Products in it will keep existing but lose their category.`)) return;
      btn.disabled = true;
      try {
        await deleteCategory(row.dataset.id);
        row.remove();
        showToast(`"${name}" deleted`);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });
}

document.querySelector('#category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const name = document.querySelector('#cat-name').value.trim();
  const slug = document.querySelector('#cat-slug').value.trim() || slugify(name);
  const editId = document.querySelector('#category-form').dataset.editId || '';

  if (!name) {
    errorMsg.textContent = 'Category name is required.';
    document.querySelector('#cat-name').focus();
    return;
  }

  saveBtn.disabled = true;
  try {
    if (editId) {
      await updateCategory(editId, name, slug);
      showToast('Category updated');
    } else {
      await createCategory(name, slug);
      showToast('Category added');
    }
    resetForm();
    renderTable(await getCategoriesWithCounts());
  } catch (err) {
    errorMsg.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
  }
});

async function init() {
  try {
    renderTable(await getCategoriesWithCounts());
  } catch (err) {
    errorMsg.textContent = err.message;
  }
}

init();
