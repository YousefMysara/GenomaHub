-- Update Quotations table to link directly to Contact Person
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id);

-- Optional: Drop the cache if needed
NOTIFY pgrst, 'reload schema';
