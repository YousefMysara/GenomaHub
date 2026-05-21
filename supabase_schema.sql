-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  logo_url text,
  website text,
  phone text,
  email text,
  address text,
  notes text,
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Laboratory'::text,
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  location text,
  lot_number text,
  serial_number text,
  expiry_date date,
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'Available'::text,
  sold_to_client uuid,
  sold_date timestamp with time zone,
  notes text,
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_sold_to_client_fkey FOREIGN KEY (sold_to_client) REFERENCES public.clients(id)
);
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  inventory_id uuid,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id),
  CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid,
  invoice_date timestamp with time zone DEFAULT now(),
  notes text,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'Draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.lead_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  type text NOT NULL DEFAULT 'Note'::text,
  content text NOT NULL,
  created_by text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lead_activities_pkey PRIMARY KEY (id),
  CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid,
  contact_id uuid,
  status text NOT NULL DEFAULT 'New'::text,
  priority text DEFAULT 'Medium'::text,
  source text,
  expected_value numeric,
  expected_close_date date,
  assigned_to text,
  quotation_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invoice_id uuid,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT leads_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT leads_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id),
  CONSTRAINT leads_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6b7280'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_relations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_product_id uuid NOT NULL,
  child_product_id uuid NOT NULL,
  relation_type text DEFAULT 'Accessory'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_relations_pkey PRIMARY KEY (id),
  CONSTRAINT product_relations_parent_product_id_fkey FOREIGN KEY (parent_product_id) REFERENCES public.products(id),
  CONSTRAINT product_relations_child_product_id_fkey FOREIGN KEY (child_product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_code text NOT NULL UNIQUE,
  name text NOT NULL,
  brand_id uuid,
  category text NOT NULL DEFAULT 'Consumables'::text,
  item_type text NOT NULL DEFAULT 'Kit'::text CHECK (item_type = ANY (ARRAY['Instrument'::text, 'Spare Parts'::text, 'Kit'::text, 'Chemical'::text, 'Control'::text, 'Labware'::text, 'General'::text, 'License'::text, 'Maintenance'::text, 'Training'::text])),
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  datasheet_url text,
  storage_conditions text,
  track_stock boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  uom text,
  purity_grade text,
  hazmat_class text,
  power_requirements text,
  dimensions text,
  weight text,
  warranty_period text,
  packaging_size text,
  sterility boolean DEFAULT false,
  license_type text,
  delivery_method text,
  reorder_level integer NOT NULL DEFAULT 5,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quote_number text NOT NULL UNIQUE,
  client_id uuid,
  date_created timestamp with time zone DEFAULT now(),
  validity_days integer DEFAULT 30,
  status text NOT NULL DEFAULT 'Draft'::text CHECK (status = ANY (ARRAY['Draft'::text, 'Sent'::text, 'Accepted'::text, 'Rejected'::text])),
  terms_conditions text DEFAULT 'Standard delivery and installation terms apply. Warranty as per manufacturer guidelines.'::text,
  subtotal numeric DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  contact_id uuid,
  CONSTRAINT quotations_pkey PRIMARY KEY (id),
  CONSTRAINT quotations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT quotations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);
CREATE TABLE public.quote_line_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  quoted_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  CONSTRAINT quote_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT quote_line_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotations(id),
  CONSTRAINT quote_line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);