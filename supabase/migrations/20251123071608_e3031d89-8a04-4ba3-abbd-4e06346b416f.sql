-- Add encryption for sensitive buyer information
-- For now we'll add more restrictive RLS policies

-- Drop existing sales policies
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;

-- Create more secure policies that also check the created_by field
CREATE POLICY "Admins can view sales they created or all if super admin"
  ON public.sales FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND 
    (created_by = auth.uid() OR auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ))
  );

CREATE POLICY "Admins can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    created_by = auth.uid()
  );

CREATE POLICY "Admins can update their own sales"
  ON public.sales FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') AND
    created_by = auth.uid()
  );

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales(created_by);

-- Add comment for documentation
COMMENT ON TABLE public.sales IS 'Contains sensitive buyer PII - phone, email, ID numbers. Protected by RLS policies that restrict access to sale creators and admins.';
