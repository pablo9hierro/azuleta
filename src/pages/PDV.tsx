import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { getProductByBarcode, getProducts, addSale, type Product } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanBarcode, Plus, Minus, Trash2, CreditCard, Keyboard, Camera } from "lucide-react";
import { toast } from "sonner";

interface PDVItem {
  product: Product;
  quantity: number;
}

export default function PDV() {
  const [items, setItems] = useState<PDVItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const addByBarcode = useCallback((barcode: string) => {
    const product = getProductByBarcode(barcode.trim());
    if (!product) {
      toast.error(`Produto não encontrado: ${barcode}`);
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
    toast.success(`${product.name} adicionado`);
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          addByBarcode(decodedText);
          // Don't stop - allow continuous scanning
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      toast.error("Não foi possível acessar a câmera");
      console.error(err);
    }
  }, [addByBarcode]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch {}
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleManualAdd = () => {
    if (!manualBarcode.trim()) return;
    addByBarcode(manualBarcode);
    setManualBarcode("");
  };

  const handleFinalize = () => {
    if (items.length === 0) return;

    addSale({
      products: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      total,
      paymentMethod: "pix",
      status: "paid",
    });

    toast.success("Venda finalizada com sucesso!");
    setItems([]);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-2xl">
        <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
          <ScanBarcode size={28} className="text-primary" />
          PDV - Ponto de Venda
        </h1>

        {/* Scanner area */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={scanning ? stopScanner : startScanner}
              variant={scanning ? "destructive" : "default"}
              className="gap-2"
            >
              <Camera size={18} />
              {scanning ? "Parar Câmera" : "Escanear Código"}
            </Button>
          </div>

          {/* Camera viewport */}
          <div
            id="barcode-reader"
            ref={scannerRef}
            className={`rounded-lg overflow-hidden ${scanning ? "block" : "hidden"}`}
            style={{ maxWidth: "100%" }}
          />

          {/* Manual barcode input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Digitar código de barras..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleManualAdd} size="icon" variant="secondary">
              <Plus size={18} />
            </Button>
          </div>
        </div>

        {/* Items list */}
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Escaneie ou digite o código de barras para adicionar produtos
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {item.product.price.toFixed(2).replace(".", ",")} × {item.quantity} ={" "}
                      <span className="font-semibold text-foreground">
                        R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="p-1.5 rounded hover:bg-muted">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="p-1.5 rounded hover:bg-muted">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => updateQty(item.product.id, -item.quantity)} className="p-1.5 rounded hover:bg-muted text-destructive ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total + Finalize */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex justify-between text-xl font-extrabold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <Button onClick={handleFinalize} className="w-full gap-2" size="lg">
              <CreditCard size={20} />
              Finalizar Venda
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
