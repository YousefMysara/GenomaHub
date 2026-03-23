-- Add extra fields for brand management
alter table public.brands
  add column if not exists logo_url text,
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();

-- Create storage bucket for brand logos if it doesn't exist
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (usually enabled by default, but let's be sure)
-- Policies for the brand-logos bucket
create policy "Public Access to Logos"
on storage.objects for select
using ( bucket_id = 'brand-logos' );

create policy "Allow Upload for Logos"
on storage.objects for insert
with check ( bucket_id = 'brand-logos' );

create policy "Allow Delete for Logos"
on storage.objects for delete
using ( bucket_id = 'brand-logos' );

-- Also ensure brands table has policies (if RLS is enabled)
create policy "Allow Public Read Brands"
on public.brands for select
using (true);

create policy "Allow All for Brands"
on public.brands for all
using (true)
with check (true);

