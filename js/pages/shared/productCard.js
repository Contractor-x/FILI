export function renderProductCard(p) {
  return `
    <a href="product.html?slug=${p.slug}" class="product-card">
      <div class="product-card-image">
        <img src="${p.image_url ?? '/assets/images/placeholder.png'}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="product-card-body">
        <h3>${p.name}</h3>
        <p class="price">₦${Number(p.price).toLocaleString()}</p>
      </div>
    </a>
  `;
}
