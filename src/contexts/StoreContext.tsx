import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Product, UpsertProduct } from "@/data/store";
import { setProductsCache } from "@/data/store";
import {
  fetchAllProductsFromDB,
  insertProductToDB,
  updateProductInDB,
  deleteProductFromDB,
  upsertProductsToDB,
} from "@/lib/supabase";
import { toast } from "sonner";

interface StoreContextValue {
  products: Product[];
  loading: boolean;
  refetch: () => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Omit<Product, "id" | "createdAt">>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertProducts: (items: UpsertProduct[]) => Promise<{ created: number; updated: number }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchAllProductsFromDB();
      setProducts(data);
    } catch {
      toast.error("Erro ao carregar produtos do banco de dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep legacy sync store.ts cache in sync for barcode lookups in PDV etc.
  useEffect(() => { setProductsCache(products); }, [products]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt">): Promise<Product> => {
    const created = await insertProductToDB(p);
    setProducts((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProduct = useCallback(async (
    id: string,
    updates: Partial<Omit<Product, "id" | "createdAt">>
  ): Promise<void> => {
    const updated = await updateProductInDB(id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await deleteProductFromDB(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const upsertProducts = useCallback(async (
    items: UpsertProduct[]
  ): Promise<{ created: number; updated: number }> => {
    const saved = await upsertProductsToDB(items);
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of saved) map.set(p.id, p);
      return Array.from(map.values());
    });
    const created = items.filter((i) => !i.existingId).length;
    const updated = items.filter((i) => !!i.existingId).length;
    return { created, updated };
  }, []);

  return (
    <StoreContext.Provider
      value={{ products, loading, refetch: load, addProduct, updateProduct, deleteProduct, upsertProducts }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
