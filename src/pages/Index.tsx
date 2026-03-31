import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import CartDrawer, { type CartItem } from "@/components/CartDrawer";
import { getProducts, type Product } from "@/data/store";
import { ShoppingCart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Index() {
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [, setRefresh] = useState(0);

  const products = useMemo(() => getProducts(), []);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Hero */}
        <div className="bg-primary rounded-2xl p-6 md:p-10 mb-8 text-primary-foreground">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">Azuzão da Construção</h1>
          <p className="text-primary-foreground/70 text-sm md:text-base">
            Materiais de construção com os melhores preços. Compre sem cadastro!
          </p>
        </div>

        {/* Search + Cart button */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative bg-accent text-accent-foreground p-3 rounded-xl hover:brightness-110 transition-all"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-20">Nenhum produto encontrado.</p>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} setItems={setCartItems} />
    </Layout>
  );
}
