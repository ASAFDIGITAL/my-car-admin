-- Create storage bucket for car images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'car-images',
  'car-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for car images bucket
CREATE POLICY "Public can view car images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'car-images');

CREATE POLICY "Admins can upload car images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'car-images' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update their car images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'car-images' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete their car images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'car-images' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    public.has_role(auth.uid(), 'admin')
  );

-- Create car_images table to track images
CREATE TABLE public.car_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.car_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for car_images
CREATE POLICY "Anyone can view car images"
  ON public.car_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert car images"
  ON public.car_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update car images"
  ON public.car_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete car images"
  ON public.car_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for better performance
CREATE INDEX idx_car_images_car_id ON public.car_images(car_id);
CREATE INDEX idx_car_images_primary ON public.car_images(car_id, is_primary);

-- Function to get primary image for a car
CREATE OR REPLACE FUNCTION public.get_car_primary_image(car_uuid UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT storage_path
  FROM public.car_images
  WHERE car_id = car_uuid AND is_primary = true
  LIMIT 1;
$$;

-- Function to set primary image (ensures only one primary per car)
CREATE OR REPLACE FUNCTION public.set_primary_car_image(image_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_car_id UUID;
BEGIN
  -- Get car_id for this image
  SELECT car_id INTO v_car_id
  FROM public.car_images
  WHERE id = image_uuid;
  
  -- Remove primary flag from all images of this car
  UPDATE public.car_images
  SET is_primary = false
  WHERE car_id = v_car_id;
  
  -- Set this image as primary
  UPDATE public.car_images
  SET is_primary = true
  WHERE id = image_uuid;
END;
$$;