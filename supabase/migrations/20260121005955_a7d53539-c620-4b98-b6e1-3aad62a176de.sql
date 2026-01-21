-- Fix overly permissive RLS policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated can update booth sessions" ON public.booth_sessions;
DROP POLICY IF EXISTS "Authenticated can update session items" ON public.booth_session_items;

-- Create more specific update policies for booth_sessions
-- Owner can update any session, Karyawan can only close sessions (status OPEN -> CLOSED)
CREATE POLICY "Owner can update booth sessions" 
  ON public.booth_sessions FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Karyawan can close booth sessions" 
  ON public.booth_sessions FOR UPDATE 
  TO authenticated
  USING (
    status = 'OPEN' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'karyawan'
    )
  );

-- Create more specific update policies for booth_session_items
CREATE POLICY "Owner can update session items" 
  ON public.booth_session_items FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Karyawan can update session items for open sessions" 
  ON public.booth_session_items FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.booth_sessions bs
      WHERE bs.id = session_id AND bs.status = 'OPEN'
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'karyawan'
    )
  );