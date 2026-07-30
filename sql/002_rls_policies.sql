-- =============================================================================
-- Phase 1 — Row Level Security & Storage Policies
-- =============================================================================

-- 1. Enable RLS on all tables
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- 2. Admin check helper
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 3. Profiles
create policy "Own profile read" on profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Own profile update" on profiles for update
  using (auth.uid() = id);

-- 4. Categories
create policy "Public read categories" on categories for select
  using (true);

create policy "Admin write categories" on categories for all
  using (public.is_admin()) with check (public.is_admin());

-- 5. Products
create policy "Public read active products"
  on products for select
  using (is_active = true or public.is_admin());

create policy "Admin insert products"
  on products for insert
  with check (public.is_admin());

create policy "Admin update products"
  on products for update
  using (public.is_admin());

create policy "Admin delete products"
  on products for delete
  using (public.is_admin());

-- 6. Product images
create policy "Public read product_images" on product_images for select
  using (true);

create policy "Admin write product_images" on product_images for all
  using (public.is_admin()) with check (public.is_admin());

-- 7. Variants
create policy "Public read variants" on variants for select
  using (true);

create policy "Admin write variants" on variants for all
  using (public.is_admin()) with check (public.is_admin());

-- 8. Orders
create policy "Own orders read" on orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Own orders insert" on orders for insert
  with check (auth.uid() = user_id);

create policy "Admin update orders" on orders for update
  using (public.is_admin());

-- 9. Order items
create policy "Own order_items read" on order_items for select
  using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

create policy "Own order_items insert" on order_items for insert
  with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- =============================================================================
-- Storage: product-images bucket (create via dashboard, policies via SQL)
-- =============================================================================

-- Public read
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Admin upload
create policy "Admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

-- Admin delete
create policy "Admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
