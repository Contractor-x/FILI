-- =============================================================================
-- Phase 4 — The 10 real FILI products (labels only, images added via admin)
-- =============================================================================
-- Paste this into the Supabase SQL Editor and run. Safe to re-run.
--
-- Creates the 10 products with name/price filled in but image_url empty, so
-- the admin list shows the 10 labelled products and you set the image + price
-- for each one from admin > Edit. It also deactivates the 4 placeholders.
-- If the products already exist, just run 005_product_sort_order.sql instead.

update products
set is_active = false
where slug in ('classic-tee', 'denim-jacket', 'running-sneakers', 'leather-belt');

insert into products (name, slug, price, stock, image_url, is_active, sort_order)
values
  ('Black Up & Down Set',  'black-up-and-down-set',  26000, 25, null, true, 1),
  ('White Up & Down Set',  'white-up-and-down-set',  26000, 25, null, true, 2),
  ('Black Hoodie',         'black-hoodie',           18500, 25, null, true, 3),
  ('White Hoodie',         'white-hoodie',           18500, 25, null, true, 4),
  ('FILI Black Hoodie',    'fili-black-hoodie',      19500, 25, null, true, 5),
  ('FILI White Hoodie',    'fili-white-hoodie',      19500, 25, null, true, 6),
  ('Black Jacket',         'black-jacket',           22000, 25, null, true, 7),
  ('White Jacket',         'white-jacket',           22000, 25, null, true, 8),
  ('Black Jacket (Front)', 'black-jacket-front',     22000, 25, null, true, 9),
  ('White Jacket (Front)', 'white-jacket-front',     22000, 25, null, true, 10)
on conflict (slug) do update set
  name = excluded.name,
  price = excluded.price,
  stock = excluded.stock,
  image_url = excluded.image_url,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
