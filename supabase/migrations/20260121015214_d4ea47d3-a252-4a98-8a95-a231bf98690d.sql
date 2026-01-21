-- Add sales_fee column to items table
ALTER TABLE public.items 
ADD COLUMN sales_fee numeric NOT NULL DEFAULT 0;

-- Add fee tracking columns to booth_sessions
ALTER TABLE public.booth_sessions 
ADD COLUMN total_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN fee_paid boolean NOT NULL DEFAULT false,
ADD COLUMN fee_paid_at timestamp with time zone,
ADD COLUMN fee_paid_by uuid REFERENCES public.profiles(user_id);

-- Create policy for owner to update fee_paid status
DROP POLICY IF EXISTS "Owner can update booth sessions" ON public.booth_sessions;
CREATE POLICY "Owner can update booth sessions" 
ON public.booth_sessions 
FOR UPDATE 
TO authenticated
USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'owner'::user_role)
)
WITH CHECK (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'owner'::user_role)
);