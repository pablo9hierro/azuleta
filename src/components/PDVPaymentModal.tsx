import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Store,
} from "lucide-react";
import {
  createAbacateBilling,
  getAbacateBilling,
  isAbacatePayConfigured,
  type AbacateBilling,
  type AbacateProduct,
} from "@/lib/abacatepay";
import { toast } from "sonner";

export type PDVPaymentMethod = "pix" | "credit" | "debit";

interface CartRow {
  productId: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface PDVPaymentModalProps {
  open: boolean;
  onClose: () => void;
  items: CartRow[];
  total: number;
  onConfirm: (method: PDVPaymentMethod) => void;
}

type Step = "select" | "pix-loading" | "pix-qrcode" | "card-confirm" | "done";

export default function PDVPaymentModal({
  open,
  onClose,
  items,
  total,
  onConfirm,
}: PDVPaymentModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedMethod, setSelectedMethod] = useState<PDVPaymentMethod>("pix");
  const [billing, setBilling] = useState<AbacateBilling | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [pollingTimer, setPollingTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Cleanup polling on unmount or close
  useEffect(() => {
    if (!open) {
      clearPolling();
      setStep("select");
      setBilling(null);
      setBillingError(null);
      setCardConfirmed(false);
      setPaymentConfirmed(false);
    }
  }, [open]);

  const clearPolling = useCallback(() => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
  }, [pollingTimer]);

  const startPixPayment = async () => {
    setStep("pix-loading");
    setBillingError(null);

    if (!isAbacatePayConfigured()) {
      // Dev/demo mode: simulate QR code with billing URL
      const mockBilling: AbacateBilling = {
        id: `mock_${Date.now()}`,
        url: `${window.location.origin}/pagamento-simulado?valor=${total.toFixed(2)}`,
        amount: Math.round(total * 100),
        status: "PENDING",
        devMode: true,
        methods: ["PIX"],
        products: items.map((i) => ({
          externalId: i.productId,
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          price: Math.round(i.unitPrice * 100),
        })),
        frequency: "ONE_TIME",
        returnUrl: window.location.origin,
        completionUrl: `${window.location.origin}/pdv`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBilling(mockBilling);
      setStep("pix-qrcode");
      return;
    }

    try {
      const abacateProducts: AbacateProduct[] = items.map((i) => ({
        externalId: i.productId,
        name: i.name,
        description: i.description || i.name,
        quantity: i.quantity,
        price: Math.round(i.unitPrice * 100), // cents
      }));

      const newBilling = await createAbacateBilling({
        products: abacateProducts,
        returnUrl: window.location.origin,
        completionUrl: `${window.location.origin}/pdv`,
      });

      setBilling(newBilling);
      setStep("pix-qrcode");
      startPolling(newBilling.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar cobrança";
      setBillingError(message);
      setStep("select");
      toast.error("Erro ao gerar PIX: " + message);
    }
  };

  const startPolling = useCallback(
    (billingId: string) => {
      clearPolling();
      const timer = setInterval(async () => {
        try {
          const updated = await getAbacateBilling(billingId);
          if (updated.status === "PAID") {
            clearInterval(timer);
            setPollingTimer(null);
            setPaymentConfirmed(true);
            setStep("done");
            setTimeout(() => {
              onConfirm("pix");
            }, 1500);
          }
        } catch {
          // silently ignore polling errors
        }
      }, 3000);
      setPollingTimer(timer);
    },
    [clearPolling, onConfirm]
  );

  const handleMethodContinue = () => {
    if (selectedMethod === "pix") {
      startPixPayment();
    } else {
      setStep("card-confirm");
    }
  };

  const handleCardConfirm = () => {
    if (!cardConfirmed) {
      toast.error("Confirme que o pagamento foi processado na maquineta");
      return;
    }
    onConfirm(selectedMethod);
  };

  const handleManualPixConfirm = () => {
    clearPolling();
    onConfirm("pix");
  };

  const handleRetryPix = () => {
    setBilling(null);
    setBillingError(null);
    startPixPayment();
  };

  const fmtBRL = (value: number) =>
    value.toFixed(2).replace(".", ",");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "pix-qrcode" ? (
              <>
                <QrCode size={20} className="text-primary" /> Pagamento PIX
              </>
            ) : step === "card-confirm" ? (
              <>
                <CreditCard size={20} className="text-primary" />
                Confirmar Pagamento
              </>
            ) : step === "done" ? (
              <>
                <CheckCircle2 size={20} className="text-green-500" /> Pago!
              </>
            ) : (
              <>
                <Store size={20} className="text-primary" /> Forma de Pagamento
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step: Select method */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-primary">
                R$ {fmtBRL(total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "itens"} no carrinho
              </p>
            </div>

            <div className="grid gap-3">
              {/* PIX */}
              <button
                onClick={() => setSelectedMethod("pix")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "pix"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <QrCode size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">PIX</p>
                  <p className="text-xs text-muted-foreground">
                    QR Code gerado pelo AbacatePay • Pagamento imediato
                  </p>
                </div>
                {selectedMethod === "pix" && (
                  <CheckCircle2 size={18} className="text-primary ml-auto shrink-0" />
                )}
              </button>

              {/* Cartão de Débito */}
              <button
                onClick={() => setSelectedMethod("debit")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "debit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Cartão de Débito</p>
                  <p className="text-xs text-muted-foreground">
                    Processado na maquineta física da loja
                  </p>
                </div>
                {selectedMethod === "debit" && (
                  <CheckCircle2 size={18} className="text-primary ml-auto shrink-0" />
                )}
              </button>

              {/* Cartão de Crédito */}
              <button
                onClick={() => setSelectedMethod("credit")}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "credit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Smartphone size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Cartão de Crédito</p>
                  <p className="text-xs text-muted-foreground">
                    Processado na maquineta física da loja
                  </p>
                </div>
                {selectedMethod === "credit" && (
                  <CheckCircle2 size={18} className="text-primary ml-auto shrink-0" />
                )}
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleMethodContinue}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step: PIX loading */}
        {step === "pix-loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-sm font-medium">Gerando QR Code PIX...</p>
            <p className="text-xs text-muted-foreground text-center">
              Conectando ao AbacatePay
            </p>
          </div>
        )}

        {/* Step: PIX QR Code */}
        {step === "pix-qrcode" && billing && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="font-bold text-lg">R$ {fmtBRL(total)}</p>
              {billing.devMode && (
                <span className="inline-block bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  MODO DEMONSTRAÇÃO
                </span>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white border-4 border-primary rounded-2xl p-3 shadow-lg">
                <QRCodeSVG
                  value={billing.url}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Cliente escaneia o QR Code com o app do banco para visualizar a
                cobrança e pagar via PIX
              </p>
            </div>

            {/* Link fallback */}
            <div className="bg-muted/40 rounded-lg p-3 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Ou compartilhe o link:</p>
              <a
                href={billing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline break-all"
              >
                <ExternalLink size={12} />
                {billing.url}
              </a>
            </div>

            {/* Status polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {isAbacatePayConfigured() ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Aguardando confirmação do pagamento...
                </>
              ) : (
                <>
                  <AlertCircle size={12} className="text-yellow-500" />
                  Demo: configure VITE_ABACATEPAY_API_KEY para webhooks reais
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryPix}
                className="gap-1"
              >
                <RefreshCw size={14} />
                Novo QR
              </Button>
              <Button
                size="sm"
                onClick={handleManualPixConfirm}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 size={14} />
                Confirmar Pago
              </Button>
            </div>

            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
              Cancelar pagamento
            </Button>
          </div>
        )}

        {/* Step: Card confirm */}
        {step === "card-confirm" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <p className="font-bold text-lg">R$ {fmtBRL(total)}</p>
              <p className="text-sm text-muted-foreground">
                {selectedMethod === "credit" ? "Cartão de Crédito" : "Cartão de Débito"} —
                Maquineta física
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <CreditCard size={16} />
                Instruções para o lojista
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 pl-4 list-decimal">
                <li>Informe o valor de <strong>R$ {fmtBRL(total)}</strong> na maquineta</li>
                <li>Solicite ao cliente que insira ou aproxime o cartão</li>
                <li>Aguarde a aprovação na maquineta</li>
                <li>Marque a confirmação abaixo e finalize a venda</li>
              </ol>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl border border-border">
              <Checkbox
                id="card-paid"
                checked={cardConfirmed}
                onCheckedChange={(v) => setCardConfirmed(Boolean(v))}
                className="mt-0.5"
              />
              <Label htmlFor="card-paid" className="text-sm cursor-pointer leading-relaxed">
                Confirmo que o pagamento de{" "}
                <strong>R$ {fmtBRL(total)}</strong> foi{" "}
                <strong>aprovado na maquineta</strong> com{" "}
                {selectedMethod === "credit" ? "cartão de crédito" : "cartão de débito"}.
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("select")}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleCardConfirm}
                disabled={!cardConfirmed}
              >
                <CheckCircle2 size={16} className="mr-1" />
                Finalizar Venda
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 size={36} className="text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-700">Pagamento confirmado!</p>
            <p className="text-sm text-muted-foreground">
              R$ {fmtBRL(total)} recebido via PIX
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
