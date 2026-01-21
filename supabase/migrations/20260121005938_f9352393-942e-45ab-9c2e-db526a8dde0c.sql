-- ============================================
-- HPP Global Booth Finance App - Database Schema
-- ============================================

-- 1. Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('owner', 'karyawan');

-- 2. Create enum for cashbook types
CREATE TYPE public.cashbook_type AS ENUM ('IN', 'OUT');

-- 3. Create enum for cashbook categories
CREATE TYPE public.cashbook_category AS ENUM (
  'PENJUALAN',
  'BAHAN_DAGANGAN',
  'OPEX',
  'MODAL_IN',
  'MODAL_OUT',
  'WITHDRAW_PROFIT',
  'PRIBADI_OWNER'
);

-- 4. Create enum for booth session status
CREATE TYPE public.session_status AS ENUM ('OPEN', 'CLOSED');

-- ============================================
-- PROFILES TABLE (linked to auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'karyawan',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read all profiles, update own
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ITEMS TABLE (Master item stok)
-- ============================================
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Items policies - everyone can read, only owner can modify
CREATE POLICY "Authenticated can view items" 
  ON public.items FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Owner can insert items" 
  ON public.items FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owner can update items" 
  ON public.items FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- BOOTH_SESSIONS TABLE (Sesi buka-tutup booth)
-- ============================================
CREATE TABLE public.booth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  opened_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  closed_by UUID REFERENCES public.profiles(user_id),
  total_sales_input NUMERIC(15,2),
  notes TEXT,
  status session_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booth_sessions ENABLE ROW LEVEL SECURITY;

-- Booth sessions policies
CREATE POLICY "Authenticated can view booth sessions" 
  ON public.booth_sessions FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Owner can create booth sessions" 
  ON public.booth_sessions FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated can update booth sessions" 
  ON public.booth_sessions FOR UPDATE 
  TO authenticated
  USING (true);

-- ============================================
-- BOOTH_SESSION_ITEMS TABLE (Stok per sesi)
-- ============================================
CREATE TABLE public.booth_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.booth_sessions(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) NOT NULL,
  qty_open NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_close NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booth_session_items ENABLE ROW LEVEL SECURITY;

-- Booth session items policies
CREATE POLICY "Authenticated can view session items" 
  ON public.booth_session_items FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Owner can insert session items" 
  ON public.booth_session_items FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated can update session items" 
  ON public.booth_session_items FOR UPDATE 
  TO authenticated
  USING (true);

-- ============================================
-- CASHBOOK TABLE (Semua arus kas)
-- ============================================
CREATE TABLE public.cashbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type cashbook_type NOT NULL,
  category cashbook_category NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  session_id UUID REFERENCES public.booth_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashbook ENABLE ROW LEVEL SECURITY;

-- Cashbook policies
CREATE POLICY "Authenticated can view cashbook" 
  ON public.cashbook FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert cashbook" 
  ON public.cashbook FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update cashbook" 
  ON public.cashbook FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- PERIOD_CLOSINGS TABLE (Rekap periode)
-- ============================================
CREATE TABLE public.period_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_opex NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(user_id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.period_closings ENABLE ROW LEVEL SECURITY;

-- Period closings policies - only owner
CREATE POLICY "Owner can view period closings" 
  ON public.period_closings FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owner can insert period closings" 
  ON public.period_closings FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booth_sessions_updated_at
  BEFORE UPDATE ON public.booth_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booth_session_items_updated_at
  BEFORE UPDATE ON public.booth_session_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'karyawan')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SEED DEFAULT ITEMS
-- ============================================
INSERT INTO public.items (name, is_active) VALUES
  ('Ayam Goreng', true),
  ('Ikan Goreng', true),
  ('Usus', true),
  ('Kulit', true),
  ('Kepala Ayam', true),
  ('Jeroan Campuran', true),
  ('Tahu Goreng', true),
  ('Tempe Goreng', true);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_cashbook_date ON public.cashbook(date);
CREATE INDEX idx_cashbook_category ON public.cashbook(category);
CREATE INDEX idx_cashbook_type ON public.cashbook(type);
CREATE INDEX idx_booth_sessions_date ON public.booth_sessions(date);
CREATE INDEX idx_booth_sessions_status ON public.booth_sessions(status);