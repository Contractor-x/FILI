-- =============================================================================
-- Phase 1 — Database Schema
-- =============================================================================

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- 3. Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references categories(id) on delete set null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Product images (gallery)
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  sort_order integer default 0
);

-- 5. Variants (size/color combos)
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,
  value text not null,
  price_override numeric(12,2),
  stock integer not null default 0 check (stock >= 0),
  sku text unique
);

-- 6. Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','delivered','cancelled')),
  total numeric(12,2) not null,
  payment_reference text,
  shipping_address jsonb,
  created_at timestamptz default now()
);

-- 7. Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null
);

-- 8. Updated-at trigger for products
create function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_touch_updated_at
  before update on products
  for each row execute procedure public.touch_updated_at();
