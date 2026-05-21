-- ========================================================
-- GENOMA FEATURE ENHANCEMENTS MIGRATION SCRIPT
-- ========================================================
-- Execute this script in your Supabase SQL Editor to initialize 
-- the settings table, FX columns, alerts view, and invoice finalization stored procedure.

-- 1. CREATE SYSTEM SETTINGS TABLE & ADD FX COLUMNS
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Disable Row Level Security on settings to ensure instant global configuration without authentication friction
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Insert default exchange rates if they don't exist
INSERT INTO public.settings (key, value) VALUES 
('USD_to_EGP', '47.50'),
('EUR_to_EGP', '51.20')
ON CONFLICT (key) DO NOTHING;

-- Add FX Shield columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EGP';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_base_price numeric;

-- Initialize original_base_price for existing catalog items
UPDATE public.products 
SET original_base_price = base_price 
WHERE original_base_price IS NULL;

-- 2. CREATE SMART CRITICAL ALERTS DATABASE VIEW
CREATE OR REPLACE VIEW public.v_critical_alerts AS
-- A. Product-level Low Stock
SELECT 
  p.id::text || '-low-stock' AS alert_key,
  'low_stock'::text AS alert_type,
  p.id AS product_id,
  p.name AS product_name,
  p.item_code,
  p.item_type,
  NULL::uuid AS inventory_id,
  NULL::text AS lot_number,
  NULL::text AS serial_number,
  COALESCE(SUM(i.quantity), 0) AS quantity,
  p.reorder_level,
  NULL::date AS expiry_date,
  NULL::integer AS days_until_expiry,
  CASE 
    WHEN COALESCE(SUM(i.quantity), 0) = 0 THEN 'CRITICAL'::text
    ELSE 'WARNING'::text
  END AS urgency
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id AND i.status = 'Available'
WHERE p.track_stock = true
GROUP BY p.id, p.name, p.item_code, p.item_type, p.reorder_level
HAVING COALESCE(SUM(i.quantity), 0) <= p.reorder_level

UNION ALL

-- B. Batch-level Expiring or Expired Items
SELECT 
  i.id::text || '-expiry' AS alert_key,
  CASE 
    WHEN i.expiry_date < CURRENT_DATE THEN 'expired'::text
    ELSE 'expiring'::text
  END AS alert_type,
  p.id AS product_id,
  p.name AS product_name,
  p.item_code,
  p.item_type,
  i.id AS inventory_id,
  i.lot_number,
  i.serial_number,
  i.quantity,
  p.reorder_level,
  i.expiry_date,
  (i.expiry_date - CURRENT_DATE)::integer AS days_until_expiry,
  CASE 
    WHEN i.expiry_date < CURRENT_DATE THEN 'CRITICAL'::text
    WHEN (i.expiry_date - CURRENT_DATE) <= 30 THEN 'CRITICAL'::text
    WHEN (i.expiry_date - CURRENT_DATE) <= 60 THEN 'WARNING'::text
    ELSE 'WATCH'::text
  END AS urgency
FROM public.inventory i
JOIN public.products p ON p.id = i.product_id
WHERE p.track_stock = true 
  AND i.status = 'Available'
  AND i.expiry_date IS NOT NULL
  AND i.expiry_date <= (CURRENT_DATE + INTERVAL '90 days');

-- 3. CREATE ATOMIC TRANSACTIONAL STOCK RPC FUNCTION
CREATE OR REPLACE FUNCTION public.finalize_invoice(inv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r_invoice record;
  r_item record;
  r_batch record;
  v_new_qty integer;
BEGIN
  -- 1. Select and lock the invoice row
  SELECT * INTO r_invoice 
  FROM public.invoices 
  WHERE id = inv_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF r_invoice.status = 'Finalized' THEN
    RAISE EXCEPTION 'Invoice is already finalized';
  END IF;
  
  -- 2. Process each item linked to the invoice
  FOR r_item IN 
    SELECT ii.*, p.name as product_name
    FROM public.invoice_items ii
    JOIN public.products p ON p.id = ii.product_id
    WHERE ii.invoice_id = inv_id
  LOOP
    -- Lock the specific inventory batch
    SELECT * INTO r_batch
    FROM public.inventory
    WHERE id = r_item.inventory_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory batch not found for product %', r_item.product_name;
    END IF;
    
    IF r_batch.quantity < r_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % (batch Lot: %, Serial: %). Requested: %, Available: %', 
        r_item.product_name, COALESCE(r_batch.lot_number, 'N/A'), COALESCE(r_batch.serial_number, 'N/A'), r_item.quantity, r_batch.quantity;
    END IF;
    
    v_new_qty := r_batch.quantity - r_item.quantity;
    
    IF v_new_qty = 0 THEN
      -- Fully sold
      UPDATE public.inventory
      SET 
        quantity = 0,
        status = 'Sold',
        location = 'Sold to: ' || COALESCE((SELECT name FROM public.clients WHERE id = r_invoice.client_id), 'Organization'),
        sold_to_client = r_invoice.client_id,
        sold_date = now(),
        updated_at = now()
      WHERE id = r_batch.id;
    ELSE
      -- Partially sold
      UPDATE public.inventory
      SET 
        quantity = v_new_qty,
        updated_at = now()
      WHERE id = r_batch.id;
    END IF;
  END LOOP;
  
  -- 3. Update invoice status
  UPDATE public.invoices
  SET status = 'Finalized'
  WHERE id = inv_id;
  
END;
$$;
