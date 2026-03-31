import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, CreditCard } from "lucide-react";
import type { Product } from "@/data/store";
import { addSale, createBilling } from "@/data/store";
import { toast } from "sonner";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartDrawer({ open, onClose, items, setItems }: CartDrawerProps) {
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    const sale = addSale({
      products: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      total,
      paymentMethod: "pix",
      status: "pending",
    });

    const billing = createBilling(
      sale.id,
      total,
      items.map((i) => ({
        externalId: i.product.id,
        name: i.product.name,
        description: i.product.description,
        quantity: i.quantity,
        price: i.product.price * 100,
      }))
    );

    toast.success("Pedido criado! Redirecionando para pagamento...", {
      description: `Billing ID: ${billing.id} (mock)`,
    });

    setItems([]);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Carrinho</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {items.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-10">Carrinho vazio</p>
          )}
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {item.product.price.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded hover:bg-muted">
                  <Minus size={14} />
                </button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded hover:bg-muted">
                  <Plus size={14} />
                </button>
                <button onClick={() => updateQty(item.product.id, -item.quantity)} className="p-1 rounded hover:bg-muted text-destructive ml-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3 pb-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full gap-2" size="lg">
              <CreditCard size={18} />
              Pagar com PIX (AbacatePay)
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
