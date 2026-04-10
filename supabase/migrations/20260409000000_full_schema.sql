-- ==============================================================
-- Full schema migration — idempotent (safe to run multiple times)
-- Targets: cumdvosqimugvzxlqtsu (new project) or any fresh project
-- ==============================================================

-- ── CUSTOMERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  phone      TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customers' AND policyname='customers_all_public') THEN
    CREATE POLICY "customers_all_public" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── PRODUCTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  alias        TEXT,
  description  TEXT NOT NULL DEFAULT 'unidade',
  barcode      TEXT DEFAULT '',
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock        INTEGER NOT NULL DEFAULT 0,
  image_url    TEXT DEFAULT '',
  deliverable  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ncm          TEXT,
  cfop         TEXT,
  unit         TEXT,
  product_code TEXT
);
-- Add missing columns if table already existed without them
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alias TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_code TEXT;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_all_public') THEN
    CREATE POLICY "products_all_public" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── SALES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total              NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method     TEXT NOT NULL DEFAULT 'pix',
  status             TEXT NOT NULL DEFAULT 'paid',
  customer_name      TEXT,
  customer_phone     TEXT,
  delivery_requested BOOLEAN NOT NULL DEFAULT false,
  delivery_cep       TEXT,
  delivery_number    TEXT,
  delivery_reference TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Add missing columns if table already existed
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='sales_all_public') THEN
    CREATE POLICY "sales_all_public" ON public.sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── SALE_ITEMS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id   UUID,          -- nullable: old sales may not have product_id
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Make product_id nullable if it was created as NOT NULL
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sale_items' AND policyname='sale_items_all_public') THEN
    CREATE POLICY "sale_items_all_public" ON public.sale_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
