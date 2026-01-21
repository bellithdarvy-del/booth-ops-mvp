-- Allow karyawan to view period closings (to see their profit share)
CREATE POLICY "Karyawan can view period closings" 
ON public.period_closings 
FOR SELECT 
TO authenticated
USING (
  EXISTS ( 
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'karyawan'::user_role
  )
);