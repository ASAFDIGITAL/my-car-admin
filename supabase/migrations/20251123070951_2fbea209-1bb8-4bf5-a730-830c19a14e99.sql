-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for car status
CREATE TYPE public.car_status AS ENUM ('available', 'sold', 'reserved', 'maintenance');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create companies (taxonomy)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create car types (taxonomy)
CREATE TABLE public.car_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create car years (taxonomy)
CREATE TABLE public.car_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cars table
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wordpress_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  status car_status NOT NULL DEFAULT 'available',
  company_id UUID REFERENCES public.companies(id),
  car_type_id UUID REFERENCES public.car_types(id),
  car_year_id UUID REFERENCES public.car_years(id),
  purchase_price DECIMAL(10, 2),
  internal_notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  sale_price DECIMAL(10, 2) NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_email TEXT,
  buyer_id_number TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles (only admins can view)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for taxonomies (admins can manage, all authenticated users can read)
CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view car types"
  ON public.car_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage car types"
  ON public.car_types FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view car years"
  ON public.car_years FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage car years"
  ON public.car_years FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cars (only admins can access)
CREATE POLICY "Admins can view all cars"
  ON public.cars FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert cars"
  ON public.cars FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cars"
  ON public.cars FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cars"
  ON public.cars FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales (only admins can access)
CREATE POLICY "Admins can view all sales"
  ON public.sales FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cars_updated_at
  BEFORE UPDATE ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial data for taxonomies
INSERT INTO public.companies (name, slug) VALUES
  ('מרצדס בנץ', 'mercedes-benz'),
  ('BMW', 'bmw'),
  ('אאודי', 'audi'),
  ('פולקסווגן', 'volkswagen'),
  ('טויוטה', 'toyota'),
  ('הונדה', 'honda');

INSERT INTO public.car_types (name, slug) VALUES
  ('ספרינטר', 'sprinter'),
  ('סדאן', 'sedan'),
  ('SUV', 'suv'),
  ('מיניבוס', 'minibus'),
  ('טנדר', 'pickup'),
  ('מסחרי', 'commercial');

INSERT INTO public.car_years (year) VALUES
  (2019), (2020), (2021), (2022), (2023), (2024), (2025);