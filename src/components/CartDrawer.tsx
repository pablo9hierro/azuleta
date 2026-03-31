import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, QrCode, CreditCard, MapPin, Store, Truck } from "lucide-react";
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

type PaymentMethod = "pix" | "credit" | "debit" | "local";

const paymentOptions: { value: PaymentMethod; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "pix", label: "PIX", icon: QrCode, desc: "QR Code instantâneo" },
  { value: "credit", label: "Crédito", icon: CreditCard, desc: "Cartão de crédito" },
  { value: "debit", label: "Débito", icon: CreditCard, desc: "Cartão de débito" },
  { value: "local", label: "No Local", icon: Store, desc: "Pagar na loja" },
];

export default function CartDrawer({ open, onClose, items, setItems }: CartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ cep: "", number: "", reference: "" });

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Check if at least one item qualifies for delivery
  const hasDeliverableItem = items.some((i) => i.product.deliverable);

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    if (wantsDelivery && (!deliveryForm.cep.trim() || !deliveryForm.number.trim())) {
      toast.error("Preencha o CEP e número para entrega");
      return;
    }

    const sale = addSale({
      products: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      total,
      paymentMethod,
      status: paymentMethod === "local" ? "pending" : "pending",
      deliveryRequested: wantsDelivery,
      deliveryCep: wantsDelivery ? deliveryForm.cep : undefined,
      deliveryNumber: wantsDelivery ? deliveryForm.number : undefined,
      deliveryReference: wantsDelivery ? deliveryForm.reference : undefined,
    });

    if (paymentMethod === "pix") {
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
      toast.success("QR Code PIX gerado! Redirecionando...", {
        description: `Billing: ${billing.id} (mock)`,
      });
    } else if (paymentMethod === "local") {
      toast.success("Pedido criado! Pague ao retirar na loja.", {
        description: `Pedido: ${sale.id}`,
      });
    } else {
      toast.success("Pagamento processado!", {
        description: `Pedido: ${sale.id} via ${paymentMethod === "credit" ? "crédito" : "débito"} (mock)`,
      });
    }

    setItems([]);
    setWantsDelivery(false);
    setDeliveryForm({ cep: "", number: "", reference: "" });
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
                {item.product.deliverable && (
                  <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 mt-0.5">
                    <Truck size={10} /> Entrega disponível
                  </span>
                )}
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
          <div className="border-t border-border pt-4 space-y-4 pb-4 overflow-y-auto">
            {/* Payment method selection */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Método de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                      paymentMethod === opt.value
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <opt.icon size={16} />
                    <div>
                      <p className="font-medium text-xs">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery option */}
            {hasDeliverableItem && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantsDelivery}
                    onChange={(e) => setWantsDelivery(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <MapPin size={14} className="text-primary" />
                  <span className="text-sm font-medium">Quero receber em casa</span>
                </label>
                <p className="text-[10px] text-muted-foreground ml-6 mt-0.5">
                  Apenas itens com entrega disponível serão enviados. Frete pago.
                </p>

                {wantsDelivery && (
                  <div className="mt-3 space-y-2 ml-6">
                    <div>
                      <Label className="text-xs">CEP *</Label>
                      <Input
                        placeholder="00000-000"
                        value={deliveryForm.cep}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, cep: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Número da Casa *</Label>
                      <Input
                        placeholder="123"
                        value={deliveryForm.number}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, number: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Referência (opcional)</Label>
                      <Input
                        placeholder="Próximo ao mercado..."
                        value={deliveryForm.reference}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, reference: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full gap-2" size="lg">
              {paymentMethod === "pix" && <><QrCode size={18} /> Gerar QR Code PIX</>}
              {paymentMethod === "credit" && <><CreditCard size={18} /> Pagar com Crédito</>}
              {paymentMethod === "debit" && <><CreditCard size={18} /> Pagar com Débito</>}
              {paymentMethod === "local" && <><Store size={18} /> Confirmar Pedido</>}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
