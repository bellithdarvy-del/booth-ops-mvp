-- Add profit sharing columns to period_closings table
ALTER TABLE public.period_closings 
ADD COLUMN owner_share_percent numeric NOT NULL DEFAULT 70,
ADD COLUMN karyawan_share_percent numeric NOT NULL DEFAULT 30,
ADD COLUMN owner_share_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN karyawan_share_amount numeric NOT NULL DEFAULT 0;