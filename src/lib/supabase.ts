import { createClient } from "@supabase/supabase-js";
import type { Product, UpsertProduct } from "@/data/store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Customer helpers ────────────────────────────────────────────────────────

export interface Customer {
  phone: string;
  name: string;
  created_at?: string;
}

/** Fetch customer by phone; returns null if not found */
export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  return data ?? null;
}

/** Upsert customer (insert or update name) */
export async function upsertCustomer(name: string, phone: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .upsert({ phone, name }, { onConflict: "phone" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Sale helpers ────────────────────────────────────────────────────────────

export interface SaleRow {
  id: string;
  total: number;
  payment_method: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_requested: boolean;
  delivery_cep: string | null;
  delivery_number: string | null;
  delivery_reference: string | null;
  created_at: string;
  sale_items?: SaleItemRow[];
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

/** Save a sale + its items to Supabase; returns the created sale id */
export async function saveSaleToSupabase(params: {
  total: number;
  paymentMethod: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryRequested: boolean;
  deliveryCep?: string;
  deliveryNumber?: string;
  deliveryReference?: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
}): Promise<string> {
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      total: params.total,
      payment_method: params.paymentMethod,
      status: params.status,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      delivery_requested: params.deliveryRequested,
      delivery_cep: params.deliveryCep ?? null,
      delivery_number: params.deliveryNumber ?? null,
      delivery_reference: params.deliveryReference ?? null,
    })
    .select("id")
    .single();

  if (saleErr) throw saleErr;

  if (params.items.length > 0) {
    const { error: itemsErr } = await supabase.from("sale_items").insert(
      params.items.map((i) => ({
        sale_id: sale.id,
        product_id: i.productId || null,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      }))
    );
    if (itemsErr) throw itemsErr;
  }

  return sale.id;
}

/** Fetch all sales for a customer by phone, with items */
export async function getSalesByPhone(phone: string): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*)")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Product helpers ──────────────────────────────────────────────────────────────────────────────────

type DbProduct = {
  id: string;
  name: string;
  alias: string | null;
  description: string;
  barcode: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  deliverable: boolean;
  created_at: string;
  ncm: string | null;
  cfop: string | null;
  unit: string | null;
  product_code: string | null;
};

function dbToProduct(row: DbProduct): Product {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias ?? undefined,
    description: row.description,
    barcode: row.barcode ?? "",
    price: Number(row.price),
    stock: row.stock,
    imageUrl: row.image_url ?? "",
    deliverable: row.deliverable,
    createdAt: row.created_at,
    ncm: row.ncm ?? undefined,
    cfop: row.cfop ?? undefined,
    unit: row.unit ?? undefined,
    productCode: row.product_code ?? undefined,
  };
}

function productToDb(p: Omit<Product, "id" | "createdAt">) {
  return {
    name: p.name,
    alias: p.alias ?? null,
    description: p.description,
    barcode: p.barcode || null,
    price: p.price,
    stock: p.stock,
    image_url: p.imageUrl || null,
    deliverable: p.deliverable,
    ncm: p.ncm ?? null,
    cfop: p.cfop ?? null,
    unit: p.unit ?? null,
    product_code: p.productCode ?? null,
  };
}

export async function fetchAllProductsFromDB(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbProduct[]).map(dbToProduct);
}

export async function insertProductToDB(p: Omit<Product, "id" | "createdAt">): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(productToDb(p))
    .select()
    .single();
  if (error) throw error;
  return dbToProduct(data as DbProduct);
}

export async function updateProductInDB(
  id: string,
  updates: Partial<Omit<Product, "id" | "createdAt">>
): Promise<Product> {
  const partialDb: Record<string, unknown> = {};
  if (updates.name !== undefined) partialDb.name = updates.name;
  if (updates.alias !== undefined) partialDb.alias = updates.alias ?? null;
  if (updates.description !== undefined) partialDb.description = updates.description;
  if (updates.barcode !== undefined) partialDb.barcode = updates.barcode || null;
  if (updates.price !== undefined) partialDb.price = updates.price;
  if (updates.stock !== undefined) partialDb.stock = updates.stock;
  if (updates.imageUrl !== undefined) partialDb.image_url = updates.imageUrl || null;
  if (updates.deliverable !== undefined) partialDb.deliverable = updates.deliverable;
  if (updates.ncm !== undefined) partialDb.ncm = updates.ncm ?? null;
  if (updates.cfop !== undefined) partialDb.cfop = updates.cfop ?? null;
  if (updates.unit !== undefined) partialDb.unit = updates.unit ?? null;
  if (updates.productCode !== undefined) partialDb.product_code = updates.productCode ?? null;
  const { data, error } = await supabase
    .from("products")
    .update(partialDb)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToProduct(data as DbProduct);
}

export async function deleteProductFromDB(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertProductsToDB(items: UpsertProduct[]): Promise<Product[]> {
  const toInsert = items.filter((i) => !i.existingId);
  const toUpdate = items.filter((i) => !!i.existingId);
  const results: Product[] = [];

  // Insert new products
  if (toInsert.length > 0) {
    const rows = toInsert.map(({ existingId: _e, ...p }) => productToDb(p));
    const { data, error } = await supabase.from("products").insert(rows).select();
    if (error) throw error;
    results.push(...(data as DbProduct[]).map(dbToProduct));
  }

  // Update existing products (upsert by id)
  if (toUpdate.length > 0) {
    const rows = toUpdate.map(({ existingId, ...p }) => ({ ...productToDb(p), id: existingId! }));
    const { data, error } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "id" })
      .select();
    if (error) throw error;
    results.push(...(data as DbProduct[]).map(dbToProduct));
  }

  return results;
}

