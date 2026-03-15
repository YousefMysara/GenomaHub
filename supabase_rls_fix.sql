-- Supabase Security Policies
-- This script creates permissive policies allowing the frontend (anon key) to read and modify data.

-- 1. Ensure RLS is enabled on all tables (Standard Practice)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to prevent duplicates)
DROP POLICY IF EXISTS "Enable all for anon" ON public.brands;
DROP POLICY IF EXISTS "Enable all for anon" ON public.products;
DROP POLICY IF EXISTS "Enable all for anon" ON public.product_relations;
DROP POLICY IF EXISTS "Enable all for anon" ON public.inventory;
DROP POLICY IF EXISTS "Enable all for anon" ON public.clients;
DROP POLICY IF EXISTS "Enable all for anon" ON public.quotations;
DROP POLICY IF EXISTS "Enable all for anon" ON public.quote_line_items;

-- 3. Create full permissive access policies for the 'anon' role (since this is an open dashboard)
CREATE POLICY "Enable all for anon" ON public.brands FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.product_relations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.inventory FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.quotations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.quote_line_items FOR ALL TO anon USING (true) WITH CHECK (true);
