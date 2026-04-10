import { useState } from "react";
import type { Product } from "@/data/store";
import { Plus, Minus, Package, X } from "lucide-react";

interface ProductCardProps {
  product: Product;
  quantity?: number;
  onAdd?: (product: Product) => void;
  onRemove?: (product: Product) => void;
}

export default function ProductCard({ product, quantity = 0, onAdd, onRemove }: ProductCardProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const inStock = product.stock > 0;

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
        <div
          className="aspect-square bg-muted relative overflow-hidden cursor-pointer"
          onClick={() => product.imageUrl && setFullscreen(true)}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.alias || product.name}
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
          {product.deliverable && (
            <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Entrega
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-sm leading-tight">{product.alias || product.name}</h3>
          <p className="text-xs text-muted-foreground">{product.description}</p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-extrabold text-primary">
              R$ {product.price.toFixed(2).replace(".", ",")}
            </span>
            {inStock && onAdd && (
              <div className="flex items-center gap-1">
                {quantity > 0 && onRemove && (
                  <>
                    <button
                      onClick={() => onRemove(product)}
                      className="bg-muted text-foreground p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                  </>
                )}
                <button
                  onClick={() => onAdd(product)}
                  className="bg-accent text-accent-foreground p-1.5 rounded-lg hover:brightness-110 transition-all active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {inStock ? `${product.stock} em estoque` : "Sem estoque"}
          </p>
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {fullscreen && product.imageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setFullscreen(false)}
          >
            <X size={28} />
          </button>
          <img
            src={product.imageUrl}
            alt={product.alias || product.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
