
-- 1. Move reorder_level to Products where it conceptually belongs
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_level integer not null default 5;

-- 2. Migrate existing reorder levels from inventory into products (if they exist)
UPDATE public.products p
SET reorder_level = i.reorder_level
FROM public.inventory i
WHERE i.product_id = p.id;

-- 3. Enhance the Inventory Table to become a Batch Ledger
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS status text default 'Available';

-- (Optional but recommended) Drop the old reorder_level from inventory to avoid confusion
ALTER TABLE public.inventory DROP COLUMN IF EXISTS reorder_level;

