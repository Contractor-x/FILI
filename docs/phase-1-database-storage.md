# Phase 1 — Database Schema, Storage & RLS

## 1. Repo structure

```
ecommerce-client/
├── index.html
├── product.html
├── category.html
├── cart.html
├── checkout.html
├── login.html
├── admin/
│   ├── index.html          # dashboard / product table
│   ├── product-edit.html   # add/edit product form
│   ├── orders.html         # phase 6
│   └── admin.css
├── css/
│   ├── main.css
│   └── admin.css
├── js/
│   ├── supabaseClient.js   # single Supabase init, exported
│   ├── api/
│   │   ├── products.js     # all product CRUD calls
│   │   ├── categories.js
│   │   ├── variants.js
│   │   ├── auth.js
│   │   └── storage.js      # image upload/delete helpers
│   ├── pages/
│   │   ├── home.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   └── admin-dashboard.js
│   └── vendor/
│       └── anime.min.js
├── assets/
│   └── images/              # static site images (logos, banners) — NOT product images
├── sql/
│   ├── 001_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_seed.sql         # optional sample data for dev
├── .env.example
├── .gitignore
└── README.md
```

**Rule of thumb:** every Supabase call lives in `js/api/*.js`. Pages only import from `api/`, never call `supabase.from(...)` directly. This keeps the schema changes contained to one place later.

`js/supabaseClient.js`:
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
Anon key is safe to expose client-side — it's designed for this, RLS is what actually protects data.

---

## 2. Database schema

### `profiles`
Extends `auth.users` with a role flag. Supabase auth already creates `auth.users`; this table adds app-specific fields.

```sql
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now()
);
```

Trigger to auto-create a profile row when a user signs up:
```sql
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
```
Admin role is set manually later (`update profiles set role = 'admin' where id = '...'`) — never let a client sign-up flow self-assign admin.

### `categories`
```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);
```

### `products`
```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),        -- optional "was" price for discounts
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references categories(id) on delete set null,
  image_url text,                        -- primary image
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### `product_images` (optional, if products need a gallery not just one image)
```sql
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  sort_order integer default 0
);
```

### `variants`
For size/color combos with their own stock/price override.
```sql
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,           -- e.g. "Size"
  value text not null,          -- e.g. "Large"
  price_override numeric(12,2), -- null = use product.price
  stock integer not null default 0 check (stock >= 0),
  sku text unique
);
```

### `orders` and `order_items` (schema now, wired up in Phase 5)
```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','delivered','cancelled')),
  total numeric(12,2) not null,
  payment_reference text,       -- Paystack/Flutterwave ref
  shipping_address jsonb,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null
);
```

### `updated_at` auto-touch trigger (for products)
```sql
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
```

---

## 3. Row Level Security (RLS)

Enable RLS on every table first:
```sql
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
```

Helper function to check admin role (avoids repeating subqueries):
```sql
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;
```

### `products`
```sql
-- Public can read active products
create policy "Public read active products"
  on products for select
  using (is_active = true or public.is_admin());

-- Only admin can write
create policy "Admin insert products"
  on products for insert
  with check (public.is_admin());

create policy "Admin update products"
  on products for update
  using (public.is_admin());

create policy "Admin delete products"
  on products for delete
  using (public.is_admin());
```

### `categories` / `variants` / `product_images`
Same pattern — public read, admin write:
```sql
create policy "Public read categories" on categories for select using (true);
create policy "Admin write categories" on categories for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read variants" on variants for select using (true);
create policy "Admin write variants" on variants for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read product_images" on product_images for select using (true);
create policy "Admin write product_images" on product_images for all using (public.is_admin()) with check (public.is_admin());
```

### `profiles`
```sql
-- Users can read/update their own profile; admin can read all
create policy "Own profile read" on profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Own profile update" on profiles for update
  using (auth.uid() = id);

-- role column should NOT be updatable by the user themselves — enforce in app logic
-- and optionally lock it down further with a column-level check via a trigger.
```

### `orders` / `order_items`
```sql
create policy "Own orders read" on orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Own orders insert" on orders for insert
  with check (auth.uid() = user_id);

create policy "Admin update orders" on orders for update
  using (public.is_admin());

create policy "Own order_items read" on order_items for select
  using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

create policy "Own order_items insert" on order_items for insert
  with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
  );
```

---

## 4. Storage (images)

In Supabase dashboard → Storage, create a bucket: **`product-images`**, set to **public** (read access needed for storefront `<img>` tags).

Storage RLS policies (bucket-level, in SQL editor):
```sql
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
```

Upload pattern from admin panel (`js/api/storage.js`):
```javascript
import { supabase } from '../supabaseClient.js';

export async function uploadProductImage(file, productId) {
  const filePath = `${productId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl; // save this into products.image_url
}
```

---

## 5. Files to create in this phase

| File | Purpose |
|---|---|
| `sql/001_schema.sql` | All `create table` statements above |
| `sql/002_rls_policies.sql` | All RLS + storage policies above |
| `sql/003_seed.sql` | A few sample categories/products for local dev/testing |
| `js/supabaseClient.js` | Single Supabase client instance |
| `.env.example` | Placeholder for `SUPABASE_URL` / `SUPABASE_ANON_KEY` (even for static HTML, document them here so you don't hardcode secrets carelessly — anon key is public-safe, but keep the pattern) |

---

## 6. How to verify Phase 1 is done

1. Run `001_schema.sql` then `002_rls_policies.sql` in Supabase SQL editor.
2. In Supabase Table Editor, manually insert a test category + product.
3. Create a test user via Supabase Auth, confirm a `profiles` row auto-appears with `role = 'customer'`.
4. Manually set that test user's role to `'admin'` in the table editor.
5. In SQL editor, run `select * from products;` while impersonating the anon role (Supabase has a "Run as" role switcher) — confirm you only see `is_active = true` rows.
6. Try an `insert` as anon — confirm it's rejected.
7. Try the same insert impersonating the admin user — confirm it succeeds.

Once all 7 checks pass, RLS is correctly locking down write access and Phase 1 is complete — move to Phase 2 (public storefront).
