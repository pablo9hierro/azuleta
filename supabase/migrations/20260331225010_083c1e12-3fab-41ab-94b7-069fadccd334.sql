
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'unidade',
  barcode TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  deliverable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  delivery_requested BOOLEAN NOT NULL DEFAULT false,
  delivery_cep TEXT,
  delivery_number TEXT,
  delivery_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Public read access for products (storefront)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO anon, authenticated USING (true);

-- Public insert/update/delete for products (no auth required per user request)
CREATE POLICY "Anyone can manage products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Public access for sales
CREATE POLICY "Anyone can view sales" ON public.sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create sales" ON public.sales FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update sales" ON public.sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Public access for sale_items
CREATE POLICY "Anyone can view sale_items" ON public.sale_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create sale_items" ON public.sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);
