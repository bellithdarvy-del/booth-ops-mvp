-- Drop the existing karyawan update policy
DROP POLICY IF EXISTS "Karyawan can close booth sessions" ON public.booth_sessions;

-- Create new policy with both USING and WITH CHECK
CREATE POLICY "Karyawan can close booth sessions" 
ON public.booth_sessions 
FOR UPDATE 
TO authenticated
USING (
  (status = 'OPEN'::session_status) AND 
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'karyawan'::user_role))
)
WITH CHECK (
  (status = 'CLOSED'::session_status) AND
  (EXISTS ( SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'karyawan'::user_role))
);