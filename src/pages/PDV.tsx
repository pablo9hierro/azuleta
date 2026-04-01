import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import PDVPaymentModal, { type PDVPaymentMethod } from "@/components/PDVPaymentModal";
import { getProductByBarcode, getProducts, addSale } from "@/data/store";
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
  const [nameMatches, setNameMatches] = useState<Product[]>([]);
  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [customTotalInput, setCustomTotalInput] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null);
  const lastScannedRef = useRef<string>("");

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const finalTotal = customTotal ?? total;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const addProductToCart = useCallback((product: Product) => {
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

  const addByBarcode = useCallback((barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    // Permanent lock: ignore same barcode until a DIFFERENT code is scanned
    if (code === lastScannedRef.current) return;
    lastScannedRef.current = code;

    const product = getProductByBarcode(code);
    if (!product) {
      toast.error(`Produto nao encontrado: ${code}`, { duration: 2000 });
      return;
    }
    addProductToCart(product);
  }, [addProductToCart]);

  // Step 1: just flip the flag so React re-renders the div as visible
  const startScanner = useCallback(() => {
    setScanning(true);
  }, []);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch { /* ignore */ }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  // Step 2: after the div is visible (scanning === true), actually start the camera
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("barcode-reader");
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 120 } },
          (decodedText: string) => { addByBarcode(decodedText); },
          () => {}
        );
      } catch {
        if (!cancelled) {
          toast.error("Câmera não disponível. Use a entrada manual.");
          setScanning(false);
        }
      }
    };

    initScanner();
    return () => { cancelled = true; };
  }, [scanning, addByBarcode]);

  // Cleanup on unmount
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
    const input = manualBarcode.trim();
    if (!input) return;

    // Try exact barcode first
    const byBarcode = getProductByBarcode(input);
    if (byBarcode) {
      addByBarcode(input);
      setManualBarcode("");
      setNameMatches([]);
      return;
    }

    // Try name search
    const allProducts = getProducts();
    const matches = allProducts.filter((p) =>
      p.name.toLowerCase().includes(input.toLowerCase())
    );
    if (matches.length === 1) {
      addProductToCart(matches[0]);
      setManualBarcode("");
      setNameMatches([]);
    } else if (matches.length > 1) {
      setNameMatches(matches);
    } else {
      toast.error(`Produto não encontrado: ${input}`, { duration: 2000 });
      setNameMatches([]);
    }
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
      total: finalTotal,
      paymentMethod: method,
      status: "paid",
    });

    const methodLabel: Record<PDVPaymentMethod, string> = {
      pix: "PIX",
      credit: "Cartao de Credito",
      debit: "Cartao de Debito",
    };

    toast.success(
      `Venda #${sale.id} finalizada! ${methodLabel[method]} - R$ ${finalTotal.toFixed(2).replace(".", ",")}`,
      { duration: 4000 }
    );

    setItems([]);
    setCustomTotal(null);
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
                placeholder="Código de barras ou nome do produto..."
                value={manualBarcode}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualBarcode(val);
                  const q = val.trim().toLowerCase();
                  if (q.length >= 2) {
                    const all = getProducts();
                    setNameMatches(all.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)).slice(0, 8));
                  } else {
                    setNameMatches([]);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button onClick={handleManualAdd} size="sm" variant="secondary" className="gap-1">
              <Plus size={15} />
              Adicionar
            </Button>
          </div>
          {/* Name search results */}
          {nameMatches.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden bg-card shadow-md">
              <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/40 border-b border-border">
                {nameMatches.length} produto{nameMatches.length > 1 ? "s" : ""} encontrado{nameMatches.length > 1 ? "s" : ""} — escolha:
              </p>
              <div className="max-h-40 overflow-y-auto divide-y divide-border">
                {nameMatches.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { addProductToCart(p); setManualBarcode(""); setNameMatches([]); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 text-left"
                  >
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
              <div className="flex justify-between items-center text-xl font-extrabold border-t border-border pt-2">
                <span>Total</span>
                {editingTotal ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customTotalInput}
                      onChange={(e) => setCustomTotalInput(e.target.value)}
                      className="w-28 h-8 text-right text-base"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { const v = parseFloat(customTotalInput); if (!isNaN(v) && v >= 0) setCustomTotal(v); setEditingTotal(false); }
                        if (e.key === "Escape") setEditingTotal(false);
                      }}
                    />
                    <Button size="sm" className="h-8 px-3" onClick={() => { const v = parseFloat(customTotalInput); if (!isNaN(v) && v >= 0) setCustomTotal(v); setEditingTotal(false); }}>OK</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={customTotal !== null ? "text-accent" : "text-primary"}>
                      R$ {finalTotal.toFixed(2).replace(".", ",")}
                    </span>
                    <button
                      onClick={() => { setCustomTotalInput(finalTotal.toFixed(2)); setEditingTotal(true); }}
                      className="text-xs text-primary/70 hover:text-primary underline font-normal"
                      title="Editar valor total"
                    >
                      Editar
                    </button>
                    {customTotal !== null && (
                      <button
                        onClick={() => setCustomTotal(null)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        title="Restaurar valor calculado"
                      >
                        ↩
                      </button>
                    )}
                  </div>
                )}
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
        total={finalTotal}
        onConfirm={handlePaymentConfirm}
      />
    </Layout>
  );
}
