-- 1. Create contacts table linked to clients (which act as organizations)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Migrate existing contact_person from clients table into contacts
INSERT INTO public.contacts (client_id, first_name, last_name, email, phone, role, is_primary)
SELECT 
  id, 
  SPLIT_PART(contact_person, ' ', 1),
  NULLIF(SUBSTRING(contact_person FROM POSITION(' ' IN contact_person) + 1), contact_person),
  email,
  phone,
  'Main Contact',
  true
FROM public.clients
WHERE contact_person IS NOT NULL AND contact_person != '';

-- 3. Create missing Invoices tables
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  notes text,
  total_amount decimal(12,2) DEFAULT 0,
  status text DEFAULT 'Draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES public.inventory(id),
  product_id uuid REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(12,2),
  created_at timestamptz DEFAULT now()
);

-- 4. Ensure inventory has sold_to metadata fields (if not already there)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sold_to_client uuid REFERENCES public.clients(id);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sold_date timestamptz;
