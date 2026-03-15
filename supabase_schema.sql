-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Brands Table
create table public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- 2. Products Table
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  item_code text not null unique,
  name text not null,
  brand_id uuid references public.brands(id),
  category text not null default 'Consumables',
  item_type text not null check(item_type in ('Equipment', 'Kit', 'Accessory', 'Software')) default 'Kit',
  description text,
  base_price numeric not null default 0,
  datasheet_url text,
  storage_conditions text,
  track_stock boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Product Relations Table (For Accessories)
create table public.product_relations (
  id uuid primary key default uuid_generate_v4(),
  parent_product_id uuid not null references public.products(id) on delete cascade,
  child_product_id uuid not null references public.products(id) on delete cascade,
  relation_type text default 'Accessory',
  created_at timestamptz default now(),
  unique(parent_product_id, child_product_id)
);

-- 4. Inventory Table
create table public.inventory (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 0,
  location text,
  reorder_level integer not null default 5,
  lot_number text,
  serial_number text,
  expiry_date date,
  updated_at timestamptz default now()
);

-- 5. Clients Table
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'Laboratory',
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- 6. Quotations Table
create table public.quotations (
  id uuid primary key default uuid_generate_v4(),
  quote_number text not null unique,
  client_id uuid references public.clients(id),
  date_created timestamptz default now(),
  validity_days integer default 30,
  status text not null default 'Draft' check(status in ('Draft', 'Sent', 'Accepted', 'Rejected')),
  terms_conditions text default 'Standard delivery and installation terms apply. Warranty as per manufacturer guidelines.',
  subtotal numeric default 0,
  discount_percent numeric default 0,
  total numeric default 0,
  notes text
);

-- 7. Quote Line Items Table
create table public.quote_line_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1,
  quoted_price numeric not null default 0,
  discount_percent numeric default 0,
  line_total numeric default 0
);

-- Enable Realtime for relevant tables to support live UI updates
alter publication supabase_realtime add table public.products, public.inventory, public.quotations, public.clients;
