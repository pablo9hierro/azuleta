import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import PDVPaymentModal, { type PDVPaymentMethod } from "@/components/PDVPaymentModal";
import { getProductByBarcode, addSale } from "@/data/store";
import type { Product } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Camera,
  Keyboard,
  Receipt,
  CreditCard,
  QrCode,
  Package,
} from "lucide-react";
import { toast } from "sonner";

interface PDVItem {
  product: Product;
  quantity: number;
}

export default function PDV() {
  const [items, setItems] = useState<PDVItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const addByBarcode = useCallback((barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    // Debounce: ignore same code within 1.5s
    const now = Date.now();
    if (code === lastScannedRef.current && now - lastScannedTimeRef.current < 1500) {
      return;
    }
    lastScannedRef.current = code;
    lastScannedTimeRef.current = now;

    const product = getProductByBarcode(code);
    if (!product) {
      toast.error(`Produto nao encontrado: ${code}`, { duration: 2000 });
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado`, { duration: 1500 });
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decodedText: string) => { addByBarcode(decodedText); },
        () => {}
      );
      setScanning(true);
    } catch {
      toast.error("Camera nao disponivel. Use a entrada manual.");
    }
  }, [addByBarcode]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch { /* ignore */ }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) { html5QrCodeRef.current.stop().catch(() => {}); }
    };
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleManualAdd = () => {
    if (!manualBarcode.trim()) return;
    addByBarcode(manualBarcode);
    setManualBarcode("");
  };

  const handleFinalize = () => {
    if (items.length === 0) return;
    stopScanner();
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = (method: PDVPaymentMethod) => {
    const sale = addSale({
      products: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      total,
      paymentMethod: method,
      status: "paid",
    });

    const methodLabel: Record<PDVPaymentMethod, string> = {
      pix: "PIX",
      credit: "Cartao de Credito",
      debit: "Cartao de Debito",
    };

    toast.success(
      `Venda #${sale.id} finalizada! ${methodLabel[method]} - R$ ${total.toFixed(2).replace(".", ",")}`,
      { duration: 4000 }
    );

    setItems([]);
    setPaymentOpen(false);
  };

  const cartRows = items.map((i) => ({
    productId: i.product.id,
    name: i.product.name,
    description: i.product.description,
    quantity: i.quantity,
    unitPrice: i.product.price,
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-28 md:pb-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ScanBarcode size={28} className="text-primary" />
            PDV - Ponto de Venda
          </h1>
          {items.length > 0 && (
            <div className="flex items-center gap-1 bg-primary text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-full">
              <ShoppingCart size={14} />
              {totalItems}
            </div>
          )}
        </div>

        {/* Scanner area */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Escaner de Codigo de Barras
          </p>
          <div className="flex gap-2">
            <Button
              onClick={scanning ? stopScanner : startScanner}
              variant={scanning ? "destructive" : "default"}
              size="sm"
              className="gap-2"
            >
              <Camera size={16} />
              {scanning ? "Parar Camera" : "Abrir Camera"}
            </Button>
          </div>
          <div
            id="barcode-reader"
            ref={scannerRef}
            className={`rounded-lg overflow-hidden bg-black ${scanning ? "block" : "hidden"}`}
            style={{ maxWidth: "100%" }}
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Digitar codigo de barras..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button onClick={handleManualAdd} size="sm" variant="secondary" className="gap-1">
              <Plus size={15} />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-sm flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary" />
              Carrinho
            </span>
            {items.length > 0 && (
              <button
                onClick={() => setItems([])}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Package size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Escaneie ou digite o codigo de barras para adicionar produtos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.product.barcode}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {item.product.price.toFixed(2).replace(".", ",")} x {item.quantity} ={" "}
                      <span className="font-semibold text-foreground">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded bg-muted hover:bg-muted/80 flex items-center justify-center">
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded bg-muted hover:bg-muted/80 flex items-center justify-center">
                      <Plus size={13} />
                    </button>
                    <button onClick={() => removeItem(item.product.id)} className="w-7 h-7 rounded hover:bg-destructive/10 flex items-center justify-center text-destructive ml-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total + Finalize */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"})</span>
                <span>R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-xl font-extrabold border-t border-border pt-2">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
                <QrCode size={18} className="text-green-600" />
                <span>PIX</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
                <CreditCard size={18} className="text-blue-500" />
                <span>Debito</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 bg-muted/30 rounded-lg">
                <CreditCard size={18} className="text-purple-500" />
                <span>Credito</span>
              </div>
            </div>
            <Button onClick={handleFinalize} className="w-full gap-2" size="lg">
              <Receipt size={18} />
              Escolher Pagamento e Finalizar
            </Button>
          </div>
        )}
      </div>

      <PDVPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        items={cartRows}
        total={total}
        onConfirm={handlePaymentConfirm}
      />
    </Layout>
  );
}
