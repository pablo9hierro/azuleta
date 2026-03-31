import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
        product_id: i.productId.startsWith("prod_") ? null : i.productId,
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
