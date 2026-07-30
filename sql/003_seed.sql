-- =============================================================================
-- Phase 1 — Sample Seed Data
-- =============================================================================

-- Categories
insert into categories (name, slug) values
  ('Clothing', 'clothing'),
  ('Footwear', 'footwear'),
  ('Accessories', 'accessories');

-- Products
insert into products (name, slug, description, price, compare_at_price, stock, category_id, image_url, is_active)
values
  (
    'Classic Tee',
    'classic-tee',
    'A comfortable cotton t-shirt for everyday wear.',
    29.99,
    39.99,
    100,
    (select id from categories where slug = 'clothing'),
    null,
    true
  ),
  (
    'Denim Jacket',
    'denim-jacket',
    'Timeless denim jacket with a modern fit.',
    89.99,
    null,
    25,
    (select id from categories where slug = 'clothing'),
    null,
    true
  ),
  (
    'Running Sneakers',
    'running-sneakers',
    'Lightweight sneakers with responsive cushioning.',
    119.99,
    149.99,
    50,
    (select id from categories where slug = 'footwear'),
    null,
    true
  ),
  (
    'Leather Belt',
    'leather-belt',
    'Genuine leather belt with brushed buckle.',
    34.99,
    null,
    75,
    (select id from categories where slug = 'accessories'),
    null,
    true
  );
