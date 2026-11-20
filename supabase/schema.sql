-- IBRO Fashion House Complete Production Schema for Supabase
create extension if not exists pgcrypto;

-- 1. Products Table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  slug text unique not null,
  description text,
  category text,
  gender text default 'Men',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  image_urls text[] not null default '{}',
  sizes text[] not null default '{"M","L","XL"}',
  colors text[] not null default '{"Black","White"}',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Product Variants Table (Optional granular tracking)
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  stock integer not null default 0 check (stock >= 0),
  sku text unique
);

-- 3. Customer Profiles
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

-- 4. Orders Table (Advance Payment + Transaction ID + No COD)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references auth.users(id),
  customer_name text not null,
  phone text not null,
  delivery_address text not null,
  items jsonb not null default '[]'::jsonb,
  payment_method text not null check (payment_method in ('bKash', 'Nagad', 'Rocket')),
  sender_number text not null,
  transaction_id text not null,
  advance_amount numeric(12,2) not null default 0,
  payment_status text not null default 'pending_verification' check (payment_status in ('pending_verification', 'verified', 'rejected')),
  order_status text not null default 'Pending' check (order_status in ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  courier_name text,
  tracking_code text,
  created_at timestamptz not null default now()
);

-- 5. Order Items Table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  sku text,
  size text,
  color text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null
);

-- 6. Coupons Table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null,
  active boolean not null default true,
  expires_at timestamptz
);

-- 7. Store Settings & Website Editor Table (Singleton row id = 1)
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'IBRO',
  site_sub_name text not null default 'FASHION HOUSE',
  tagline text default 'Modern fashion for everyday confidence.',
  hero_badge text default 'THE NEW SEASON EDIT',
  hero_title_line1 text default 'Style that feels',
  hero_title_italic text default 'like you.',
  hero_description text default 'Thoughtful essentials. Modern silhouettes. Confidence in every detail.',
  hero_banner_url text default 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000',
  logo_url text default '',
  font_family text default 'DM Sans + Playfair Display',
  primary_color text default '#203746',
  accent_bg_color text default '#dcebf0',
  page_bg_color text default '#fbfcfa',
  whatsapp_number text default '8801700000000',
  bkash_number text default '01700000000',
  nagad_number text default '01800000000',
  rocket_number text default '01900000000',
  advance_payment_amount numeric(12,2) not null default 150,
  advance_payment_note text default 'Cash on Delivery চালু নেই। অর্ডার কনফার্ম করতে নির্ধারিত অগ্রিম পেমেন্ট পাঠিয়ে Transaction ID জমা দিন।',
  delivery_fee_inside_dhaka numeric(12,2) not null default 70,
  delivery_fee_outside_dhaka numeric(12,2) not null default 130,
  show_trust_bar boolean not null default true,
  show_story_section boolean not null default true,
  story_badge text default 'THE IBRO WAY',
  story_title_line1 text default 'Less noise.',
  story_title_italic text default 'More meaning.',
  story_description text default 'Considered design, comfortable fits and pieces you will reach for again and again.',
  footer_tagline text default 'Wear your confidence. Everyday, your way.',
  google_drive_connected boolean not null default false,
  google_drive_email text default '',
  google_drive_folder_id text default '',
  google_drive_refresh_token text default '',
  daily_backup_enabled boolean not null default true,
  last_backup_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- 8. Daily Backup Logs Table
create table if not exists public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  backup_type text not null default 'daily_full_backup',
  status text not null default 'success',
  drive_file_id text,
  drive_file_name text,
  records_count jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;
alter table public.backup_logs enable row level security;

-- Public Read Policies
create policy "Public can read active products" on public.products
for select using (active = true);

create policy "Public can read variants of active products" on public.product_variants
for select using (exists (
  select 1 from public.products p
  where p.id = product_variants.product_id and p.active = true
));

create policy "Public can read store settings" on public.store_settings
for select using (id = 1);

-- Admin Full Access Policies (using user metadata {"role": "admin"})
create policy "Admins manage all products" on public.products
for all to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "Admins manage all orders" on public.orders
for all to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "Admins manage store settings" on public.store_settings
for all to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "Admins view backup logs" on public.backup_logs
for select to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Customers Read/Update Own Profile
create policy "Customers read own profile" on public.customer_profiles
for select to authenticated using (auth.uid() = id);
create policy "Customers update own profile" on public.customer_profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create Storage Bucket for Product Images & Logos/Banners
insert into storage.buckets (id, name, public)
values ('store-media', 'store-media', true)
on conflict (id) do nothing;

create policy "Public read store-media" on storage.objects
for select using (bucket_id = 'store-media');

create policy "Authenticated upload store-media" on storage.objects
for insert to authenticated with check (bucket_id = 'store-media');


-- Seed initial 6 starter products into database (so deleting/editing works across all devices)
insert into public.products (id, sku, name, slug, description, category, gender, price, compare_at_price, image_urls, sizes, colors, stock, active)
values
  ('11111111-1111-4111-8111-111111111101', 'IBRO-SH-001', 'Linen Everyday Shirt', 'linen-everyday-shirt', 'Breathable pure cotton-linen blend shirt tailored for all-day comfort.', 'Shirts', 'Men', 1890, 2200, '{"https://images.unsplash.com/photo-1603252109303-2751441dd157?w=700"}', '{"M","L","XL"}', '{"White","Sky Blue"}', 25, true),
  ('11111111-1111-4111-8111-111111111102', 'IBRO-TS-002', 'Cotton Essential Tee', 'cotton-essential-tee', '180 GSM combed organic cotton t-shirt with relaxed modern fit.', 'T-Shirts', 'Men', 990, 1250, '{"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700"}', '{"M","L","XL","XXL"}', '{"White","Black","Navy"}', 40, true),
  ('11111111-1111-4111-8111-111111111103', 'IBRO-KN-003', 'Soft Knit Cardigan', 'soft-knit-cardigan', 'Lightweight textured knit cardigan with minimal button closure.', 'Knitwear', 'Women', 2450, null, '{"https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=700"}', '{"S","M","L"}', '{"Cream","Sage"}', 15, true),
  ('11111111-1111-4111-8111-111111111104', 'IBRO-CO-004', 'Modern Daily Look', 'modern-daily-look', 'Effortless everyday ensemble crafted with soft woven fabric.', 'Collection', 'Women', 1690, null, '{"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700"}', '{"S","M","L"}', '{"Beige","Olive"}', 18, true),
  ('11111111-1111-4111-8111-111111111105', 'IBRO-SH-005', 'Classic Overshirt', 'classic-overshirt', 'Structured twill overshirt suitable for layering in any season.', 'Shirts', 'Men', 2190, null, '{"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=700"}', '{"M","L","XL"}', '{"Charcoal","Sand"}', 20, true),
  ('11111111-1111-4111-8111-111111111106', 'IBRO-TR-006', 'Relaxed Trousers', 'relaxed-trousers', 'Tailored straight-fit trousers with comfortable elastic waist detail.', 'Trousers', 'Men', 1990, null, '{"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=700"}', '{"30","32","34","36"}', '{"Khaki","Black"}', 22, true)
on conflict (sku) do nothing;
