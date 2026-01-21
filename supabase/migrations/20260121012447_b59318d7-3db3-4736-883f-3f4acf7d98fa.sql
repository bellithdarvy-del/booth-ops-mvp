-- Add price column to items table
ALTER TABLE public.items 
ADD COLUMN price numeric NOT NULL DEFAULT 0;