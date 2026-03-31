import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Minus, Plus, Trash2, QrCode, CreditCard, MapPin, Truck,
  Loader2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, ShoppingBag, Copy, Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Product } from "@/data/store";
import { addSale } from "@/data/store";
import {
  createAbacateBilling,
  getAbacateBilling,
  isAbacatePayConfigured,
  type AbacateBilling,
  type AbacateProduct,
} from "@/lib/abacatepay";
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

type PaymentMethod = "pix" | "credit" | "debit";
type Step = "cart" | "pix-loading" | "pix-qrcode" | "card-form" | "card-processing";

interface ReceiptSnapshot {
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  paymentMethod: PaymentMethod;
  installments: string;
  wantsDelivery: boolean;
  deliveryCep: string;
  deliveryNumber: string;
  deliveryReference: string;
  paidAt: string;
}

interface CardForm {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  installments: string;
}

function fmtCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length > 2) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
}

export default function CartDrawer({ open, onClose, items, setItems }: CartDrawerProps) {
  const [step, setStep] = useState<Step>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ cep: "", number: "", reference: "" });
  const [pixBilling, setPixBilling] = useState<AbacateBilling | null>(null);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>({ number: "", name: "", expiry: "", cvv: "", installments: "1" });
  const [cardErrors, setCardErrors] = useState<Partial<CardForm>>({});
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const receiptSnapshotRef = useRef<ReceiptSnapshot | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const hasDeliverableItem = items.some((i) => i.product.deliverable);

  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("cart");
      setPixBilling(null);
      setSuccessOrder(null);
      setCardForm({ number: "", name: "", expiry: "", cvv: "", installments: "1" });
      setCardErrors({});
    }
  }, [open]);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const startPolling = (billingId: string, saleId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const updated = await getAbacateBilling(billingId);
        if (updated.status === "PAID") { stopPolling(); setSuccessOrder(saleId); }
      } catch { /* ignore */ }
    }, 3000);
  };

  const fmtBRL = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const validateDelivery = () => {
    if (wantsDelivery && (!deliveryForm.cep.trim() || !deliveryForm.number.trim())) {
      toast.error("Preencha o CEP e numero para entrega"); return false;
    }
    return true;
  };

  const createSale = (method: PaymentMethod) =>
    addSale({
      products: items.map((i) => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, unitPrice: i.product.price })),
      total, paymentMethod: method, status: "pending",
      deliveryRequested: wantsDelivery,
      deliveryCep: wantsDelivery ? deliveryForm.cep : undefined,
      deliveryNumber: wantsDelivery ? deliveryForm.number : undefined,
      deliveryReference: wantsDelivery ? deliveryForm.reference : undefined,
    });

  const handleClose = () => {
    stopPolling();
    setItems([]);
    setWantsDelivery(false);
    setDeliveryForm({ cep: "", number: "", reference: "" });
    setPixBilling(null);
    setStep("cart");
    setSuccessOrder(null);
    setCardForm({ number: "", name: "", expiry: "", cvv: "", installments: "1" });
    setCardErrors({});
    onClose();
  };

  const handleSuccessClose = () => {
    toast.success("Obrigado pela compra! 🎉");
    handleClose();
  };

  const handleCopyPixUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Copie o link manualmente.");
    }
  };

  const handlePixCheckout = async () => {
    if (!validateDelivery()) return;
    receiptSnapshotRef.current = {
      items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, unitPrice: i.product.price })),
      total,
      paymentMethod: "pix",
      installments: "1",
      wantsDelivery,
      deliveryCep: deliveryForm.cep,
      deliveryNumber: deliveryForm.number,
      deliveryReference: deliveryForm.reference,
      paidAt: new Date().toLocaleString("pt-BR"),
    };
    setStep("pix-loading");
    try {
      const sale = createSale("pix");
      let billing: AbacateBilling;
      if (isAbacatePayConfigured()) {
        const abacateProducts: AbacateProduct[] = items.map((i) => ({
          externalId: i.product.id,
          name: i.product.name,
          description: i.product.description || i.product.name,
          quantity: i.quantity,
          price: Math.round(i.product.price * 100),
        }));
        billing = await createAbacateBilling({
          products: abacateProducts,
          returnUrl: window.location.origin,
          completionUrl: `${window.location.origin}/?pedido=${sale.id}&pago=true`,
        });
        startPolling(billing.id, sale.id);
      } else {
        billing = {
          id: `demo_${sale.id}`,
          url: `${window.location.origin}/?pedido=${sale.id}&demo_pix=true`,
          amount: Math.round(total * 100),
          status: "PENDING",
          devMode: true,
          methods: ["PIX"],
          products: items.map((i) => ({
            externalId: i.product.id,
            name: i.product.name,
            description: i.product.description,
            quantity: i.quantity,
            price: Math.round(i.product.price * 100),
          })),
          frequency: "ONE_TIME",
          returnUrl: window.location.origin,
          completionUrl: `${window.location.origin}/?pedido=${sale.id}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTimeout(() => setSuccessOrder(sale.id), 8000);
      }
      setPixBilling(billing);
      setStep("pix-qrcode");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar PIX";
      toast.error("Erro AbacatePay: " + msg);
      setStep("cart");
    }
  };

  const validateCard = (): boolean => {
    const errs: Partial<CardForm> = {};
    const digits = cardForm.number.replace(/\D/g, "");
    if (digits.length < 13) errs.number = "Número inválido";
    if (!cardForm.name.trim()) errs.name = "Nome obrigatório";
    if (cardForm.expiry.length < 5) errs.expiry = "Validade inválida";
    if (cardForm.cvv.length < 3) errs.cvv = "CVV inválido";
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCardSubmit = async () => {
    if (!validateCard()) return;
    if (!validateDelivery()) return;
    receiptSnapshotRef.current = {
      items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, unitPrice: i.product.price })),
      total,
      paymentMethod,
      installments: cardForm.installments,
      wantsDelivery,
      deliveryCep: deliveryForm.cep,
      deliveryNumber: deliveryForm.number,
      deliveryReference: deliveryForm.reference,
      paidAt: new Date().toLocaleString("pt-BR"),
    };
    setStep("card-processing");
    const sale = createSale(paymentMethod as "credit" | "debit");
    await new Promise((r) => setTimeout(r, 2500));
    setSuccessOrder(sale.id);
  };

  const orderCode = successOrder ? "#" + successOrder.slice(-4).toUpperCase().padStart(4, "0") : "";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v && step !== "card-processing") handleClose(); }}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {step === "cart" && "Carrinho"}
              {step === "pix-loading" && "Gerando PIX..."}
              {step === "pix-qrcode" && "Pague via PIX"}
              {step === "card-form" && `Pagamento com ${paymentMethod === "credit" ? "Crédito" : "Débito"}`}
              {step === "card-processing" && "Processando..."}
            </SheetTitle>
          </SheetHeader>

          {/* ── CART STEP ── */}
          {step === "cart" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 py-4">
                {items.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-10">Carrinho vazio</p>
                )}
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtBRL(item.product.price)}</p>
                      {item.product.deliverable && (
                        <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 mt-0.5">
                          <Truck size={10} /> Entrega disponível
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded hover:bg-muted"><Minus size={14} /></button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded hover:bg-muted"><Plus size={14} /></button>
                      <button onClick={() => updateQty(item.product.id, -item.quantity)} className="p-1 rounded hover:bg-muted text-destructive ml-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div className="border-t border-border pt-4 space-y-4 pb-4 overflow-y-auto">
                  {/* Payment methods */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Método de Pagamento</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["pix", "credit", "debit"] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center text-sm transition-all ${
                            paymentMethod === m ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          {m === "pix" ? <QrCode size={18} /> : <CreditCard size={18} />}
                          <span className="text-xs font-medium">{m === "pix" ? "PIX" : m === "credit" ? "Crédito" : "Débito"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery */}
                  {hasDeliverableItem && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={wantsDelivery} onChange={(e) => setWantsDelivery(e.target.checked)} className="w-4 h-4 accent-primary" />
                        <MapPin size={14} className="text-primary" />
                        <span className="text-sm font-medium">Quero receber em casa</span>
                      </label>
                      {wantsDelivery && (
                        <div className="mt-3 space-y-2 ml-6">
                          <div><Label className="text-xs">CEP *</Label><Input placeholder="00000-000" value={deliveryForm.cep} onChange={(e) => setDeliveryForm({ ...deliveryForm, cep: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Número *</Label><Input placeholder="123" value={deliveryForm.number} onChange={(e) => setDeliveryForm({ ...deliveryForm, number: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Referência</Label><Input placeholder="Próximo ao mercado..." value={deliveryForm.reference} onChange={(e) => setDeliveryForm({ ...deliveryForm, reference: e.target.value })} className="h-8 text-sm" /></div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{fmtBRL(total)}</span>
                  </div>

                  {paymentMethod === "pix" ? (
                    <Button onClick={handlePixCheckout} className="w-full gap-2" size="lg">
                      <QrCode size={18} /> Gerar QR Code PIX
                    </Button>
                  ) : (
                    <Button onClick={() => { if (validateDelivery()) setStep("card-form"); }} className="w-full gap-2" size="lg">
                      <CreditCard size={18} /> Pagar com {paymentMethod === "credit" ? "Crédito" : "Débito"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PIX LOADING ── */}
          {step === "pix-loading" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <Loader2 size={48} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando cobrança PIX...</p>
            </div>
          )}

          {/* ── PIX QR CODE ── */}
          {step === "pix-qrcode" && pixBilling && (
            <div className="flex flex-col flex-1 overflow-y-auto space-y-4 py-4">
              <div className="text-center space-y-1">
                <p className="font-bold text-base flex items-center justify-center gap-2">
                  <QrCode size={18} className="text-green-600" /> QR Code PIX gerado!
                </p>
                <p className="text-2xl font-extrabold text-primary">{fmtBRL(total)}</p>
                {pixBilling.devMode && (
                  <span className="inline-block bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">MODO DEMONSTRAÇÃO</span>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="bg-white border-4 border-primary rounded-2xl p-2 shadow-md">
                  <QRCodeSVG value={pixBilling.url} size={200} level="M" includeMargin={false} />
                </div>
                <p className="text-xs text-muted-foreground text-center">Escaneie com o app do banco para pagar via PIX</p>
              </div>

              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <p className="text-xs text-muted-foreground text-center">Ou copie a chave PIX e cole no app do banco:</p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-[11px] text-muted-foreground font-mono break-all leading-tight select-all">
                    {pixBilling.url}
                  </div>
                  <button
                    onClick={() => handleCopyPixUrl(pixBilling.url)}
                    className={`shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      pixCopied ? "border-green-500 bg-green-50 text-green-700" : "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                    }`}
                  >
                    {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-[10px]">{pixCopied ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
                <a href={pixBilling.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink size={11} /> Abrir link no navegador
                </a>
              </div>

              {!isAbacatePayConfigured() && (
                <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-lg">
                  <AlertCircle size={14} /> Configure VITE_ABACATEPAY_API_KEY para cobranças reais
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                <Loader2 size={13} className="animate-spin" />
                Aguardando confirmação do pagamento...
              </div>

              <Button variant="outline" size="sm" onClick={() => setStep("cart")} className="gap-1 text-xs">
                <RefreshCw size={13} /> Voltar ao carrinho
              </Button>
            </div>
          )}

          {/* ── CARD FORM ── */}
          {step === "card-form" && (
            <div className="flex flex-col flex-1 overflow-y-auto space-y-4 py-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Número do Cartão *</Label>
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={cardForm.number}
                    onChange={(e) => { setCardForm({ ...cardForm, number: fmtCard(e.target.value) }); setCardErrors({ ...cardErrors, number: undefined }); }}
                    className={`h-10 text-sm tracking-widest ${cardErrors.number ? "border-destructive" : ""}`}
                  />
                  {cardErrors.number && <p className="text-xs text-destructive mt-0.5">{cardErrors.number}</p>}
                </div>
                <div>
                  <Label className="text-xs">Nome no Cartão *</Label>
                  <Input
                    placeholder="NOME COMPLETO"
                    value={cardForm.name}
                    onChange={(e) => { setCardForm({ ...cardForm, name: e.target.value.toUpperCase() }); setCardErrors({ ...cardErrors, name: undefined }); }}
                    className={`h-10 text-sm ${cardErrors.name ? "border-destructive" : ""}`}
                  />
                  {cardErrors.name && <p className="text-xs text-destructive mt-0.5">{cardErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Validade *</Label>
                    <Input
                      placeholder="MM/AA"
                      value={cardForm.expiry}
                      onChange={(e) => { setCardForm({ ...cardForm, expiry: fmtExpiry(e.target.value) }); setCardErrors({ ...cardErrors, expiry: undefined }); }}
                      className={`h-10 text-sm ${cardErrors.expiry ? "border-destructive" : ""}`}
                    />
                    {cardErrors.expiry && <p className="text-xs text-destructive mt-0.5">{cardErrors.expiry}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">CVV *</Label>
                    <Input
                      placeholder="000"
                      type="password"
                      maxLength={4}
                      value={cardForm.cvv}
                      onChange={(e) => { setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }); setCardErrors({ ...cardErrors, cvv: undefined }); }}
                      className={`h-10 text-sm ${cardErrors.cvv ? "border-destructive" : ""}`}
                    />
                    {cardErrors.cvv && <p className="text-xs text-destructive mt-0.5">{cardErrors.cvv}</p>}
                  </div>
                </div>
                {paymentMethod === "credit" && (
                  <div>
                    <Label className="text-xs">Parcelas</Label>
                    <select
                      value={cardForm.installments}
                      onChange={(e) => setCardForm({ ...cardForm, installments: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {[1, 2, 3, 6, 12].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}x {n === 1 ? "sem juros" : `de ${fmtBRL(total / n)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span className="text-primary">{fmtBRL(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setStep("cart")}>Voltar</Button>
                <Button onClick={handleCardSubmit} className="gap-2">
                  <CreditCard size={16} /> Confirmar
                </Button>
              </div>
            </div>
          )}

          {/* ── CARD PROCESSING ── */}
          {step === "card-processing" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <Loader2 size={48} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando pagamento...</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── SUCCESS DIALOG / COMPROVANTE ── */}
      <Dialog open={!!successOrder} onOpenChange={(v) => { if (!v) handleSuccessClose(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {(() => {
            const r = receiptSnapshotRef.current;
            const methodLabel: Record<PaymentMethod, string> = { pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito" };
            return (
              <div className="flex flex-col gap-4 py-2">
                {/* Header */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 size={36} className="text-green-600" />
                  </div>
                  <h2 className="text-xl font-extrabold text-green-700 dark:text-green-400">Pagamento Confirmado!</h2>
                  <p className="text-muted-foreground text-sm">Obrigado pela sua compra na Azuzão da Construção!</p>
                </div>

                {/* Comprovante box */}
                <div className="border border-border rounded-xl overflow-hidden text-sm">
                  {/* Código e data */}
                  <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Código do Pedido</p>
                      <p className="text-2xl font-black tracking-widest text-primary">{orderCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Data</p>
                      <p className="text-xs font-medium">{r?.paidAt ?? new Date().toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="px-4 py-3 space-y-1.5 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Itens</p>
                    {r?.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="flex-1 text-xs">
                          <span className="font-semibold text-foreground">{item.quantity}×</span>{" "}
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{fmtBRL(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pagamento + Total */}
                  <div className="px-4 py-3 space-y-1.5 border-t border-border bg-muted/30">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Método</span>
                      <span className="font-medium">{r ? methodLabel[r.paymentMethod] : "—"}</span>
                    </div>
                    {r?.paymentMethod === "credit" && r.installments !== "1" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Parcelas</span>
                        <span className="font-medium">{r.installments}× de {fmtBRL((r.total) / Number(r.installments))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{fmtBRL(r?.total ?? 0)}</span>
                    </div>
                  </div>

                  {/* Entrega */}
                  {r?.wantsDelivery && (
                    <div className="px-4 py-3 border-t border-border space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Truck size={11} /> Endereço de Entrega
                      </p>
                      <p className="text-xs">CEP: <span className="font-medium">{r.deliveryCep}</span> — Nº <span className="font-medium">{r.deliveryNumber}</span></p>
                      {r.deliveryReference && <p className="text-xs text-muted-foreground">Ref: {r.deliveryReference}</p>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <ShoppingBag size={13} />
                  <span>Guarde o código do pedido para acompanhamento</span>
                </div>

                <Button onClick={handleSuccessClose} className="w-full gap-2" size="lg">
                  <CheckCircle2 size={18} /> Fechar Comprovante
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
