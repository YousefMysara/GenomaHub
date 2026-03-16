ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS uom text,
ADD COLUMN IF NOT EXISTS purity_grade text,
ADD COLUMN IF NOT EXISTS hazmat_class text,
ADD COLUMN IF NOT EXISTS power_requirements text,
ADD COLUMN IF NOT EXISTS dimensions text,
ADD COLUMN IF NOT EXISTS weight text,
ADD COLUMN IF NOT EXISTS warranty_period text,
ADD COLUMN IF NOT EXISTS packaging_size text,
ADD COLUMN IF NOT EXISTS sterility boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS license_type text,
ADD COLUMN IF NOT EXISTS delivery_method text;
