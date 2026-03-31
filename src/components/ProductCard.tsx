import type { Product } from "@/data/store";
import { ShoppingCart, Package } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const inStock = product.stock > 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-muted-foreground/40" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
              Esgotado
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-extrabold text-primary">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </span>
          {inStock && onAddToCart && (
            <button
              onClick={() => onAddToCart(product)}
              className="bg-accent text-accent-foreground p-2 rounded-lg hover:brightness-110 transition-all active:scale-95"
            >
              <ShoppingCart size={18} />
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {inStock ? `${product.stock} em estoque` : "Sem estoque"}
        </p>
      </div>
    </div>
  );
}
