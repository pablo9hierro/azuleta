import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PackageSearch, Loader2, Receipt, Truck, CheckCircle2,
  XCircle, Phone, User as UserIcon, LogOut,
} from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";
import {
  getCustomerByPhone,
  upsertCustomer,
  getSalesByPhone,
  type SaleRow,
} from "@/lib/supabase";
import { toast } from "sonner";

const statusLabel: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  paid: { label: "Pago", icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-destructive" },
};

function getStatus(status: string) {
  return statusLabel[status] ?? { label: "Pago", icon: CheckCircle2, color: "text-green-600" };
}

const methodLabel: Record<string, string> = {
  pix: "PIX",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
};

function fmtBRL(v: number) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MeusPedidos() {
  const { customer, setCustomer, clearCustomer } = useCustomer();
  const navigate = useNavigate();

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(!customer);
  const [dialogPhone, setDialogPhone] = useState(customer?.phone ?? "");
  const [dialogName, setDialogName] = useState(customer?.name ?? "");
  const [dialogLoading, setDialogLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // orders
  const [orders, setOrders] = useState<SaleRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SaleRow | null>(null);

  const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length > 10) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length > 6) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    if (d.length > 2) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return d;
  };

  const loadOrders = async (phone: string) => {
    setLoadingOrders(true);
    try {
      const data = await getSalesByPhone(phone);
      setOrders(data);
    } catch {
      toast.error("Erro ao carregar pedidos.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (customer) loadOrders(customer.phone);
  }, [customer]);

  const handleDialogSubmit = async () => {
    const rawPhone = dialogPhone.replace(/\D/g, "");
    if (rawPhone.length < 10) { toast.error("Telefone inválido."); return; }

    setDialogLoading(true);
    try {
      const existing = await getCustomerByPhone(rawPhone);

      if (existing && !isRegisterMode) {
        // found → log in
        setCustomer({ name: existing.name, phone: rawPhone });
        setDialogOpen(false);
        loadOrders(rawPhone);
      } else if (!existing || isRegisterMode) {
        // not found → offer register
        if (!isRegisterMode) {
          // first time: phone not found, switch to register mode
          if (!dialogName.trim()) {
            setIsRegisterMode(true);
            setDialogLoading(false);
            return;
          }
        }
        if (!dialogName.trim()) { toast.error("Digite seu nome para se cadastrar."); setDialogLoading(false); return; }
        await upsertCustomer(dialogName.trim(), rawPhone);
        setCustomer({ name: dialogName.trim(), phone: rawPhone });
        toast.success(`Bem-vindo, ${dialogName.trim()}! Cadastro criado.`);
        setDialogOpen(false);
        loadOrders(rawPhone);
      }
    } catch {
      toast.error("Erro ao identificar cliente.");
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <PackageSearch size={26} className="text-primary" />
            Meus Pedidos
          </h1>
          {customer && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon size={15} className="text-primary" />
                </div>
                <span className="text-sm font-semibold">{customer.name}</span>
              </div>
              <button
                title="Sair"
                onClick={() => { clearCustomer(); setOrders([]); setDialogOpen(true); setIsRegisterMode(false); }}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-destructive/10 flex items-center justify-center transition-colors group"
              >
                <LogOut size={15} className="text-muted-foreground group-hover:text-destructive" />
              </button>
            </div>
          )}
        </div>

        {/* Orders list */}
        {customer && (
          loadingOrders ? (
            <div className="flex justify-center py-16">
              <Loader2 size={36} className="animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Receipt size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum pedido encontrado.</p>
              <p className="text-sm mt-1">Seus pedidos aparecerão aqui após a compra.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const st = getStatus(order.status);
                const Icon = st.icon;
                const code = "#" + order.id.slice(-4).toUpperCase().padStart(4, "0");
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full text-left border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    {/* Header */}
                    <div className="bg-muted/40 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Pedido</span>
                        <p className="text-lg font-black text-primary tracking-wider">{code}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold flex items-center gap-1 justify-end ${st.color}`}>
                          <Icon size={14} /> {st.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-4 py-3 space-y-1.5 border-t border-border">
                      {(order.sale_items ?? []).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{item.quantity}×</span>{" "}
                            {item.product_name}
                          </span>
                          <span className="shrink-0">{fmtBRL(Number(item.unit_price) * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals + method */}
                    <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        {methodLabel[order.payment_method] ?? order.payment_method}
                      </span>
                      <span className="text-base font-bold text-primary">{fmtBRL(Number(order.total))}</span>
                    </div>

                    {/* Delivery */}
                    {order.delivery_requested && (
                      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                        <Truck size={12} />
                        Entrega: CEP {order.delivery_cep}, nº {order.delivery_number}
                        {order.delivery_reference ? ` — ${order.delivery_reference}` : ""}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Order detail dialog */}
      {selectedOrder && (() => {
        const st = getStatus(selectedOrder.status);
        const Icon = st.icon;
        const code = "#" + selectedOrder.id.slice(-4).toUpperCase().padStart(4, "0");
        return (
          <Dialog open={!!selectedOrder} onOpenChange={(v) => { if (!v) setSelectedOrder(null); }}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pedido</p>
                    <p className="text-2xl font-black text-primary">{code}</p>
                  </div>
                  <p className={`text-sm font-semibold flex items-center gap-1 ${st.color}`}>
                    <Icon size={16} /> {st.label}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(selectedOrder.created_at)}</p>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens</div>
                  <div className="divide-y divide-border">
                    {(selectedOrder.sale_items ?? []).map((item) => (
                      <div key={item.id} className="px-3 py-2 flex justify-between text-sm">
                        <span>
                          <span className="font-semibold">{item.quantity}×</span> {item.product_name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{fmtBRL(Number(item.unit_price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-border bg-muted/20 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">{fmtBRL(Number(selectedOrder.total))}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">Pagamento:</span> {methodLabel[selectedOrder.payment_method] ?? selectedOrder.payment_method}</p>
                  {selectedOrder.delivery_requested && (
                    <p className="flex items-center gap-1.5">
                      <Truck size={13} />
                      CEP {selectedOrder.delivery_cep}, nº {selectedOrder.delivery_number}
                      {selectedOrder.delivery_reference ? ` — ${selectedOrder.delivery_reference}` : ""}
                    </p>
                  )}
                </div>

                <Button className="w-full" onClick={() => setSelectedOrder(null)}>Fechar</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Identification dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) navigate("/"); }}>
        <DialogContent className="sm:max-w-xs">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Receipt size={22} className="text-primary" />
              </div>
              <h2 className="text-lg font-extrabold">
                {isRegisterMode ? "Criar cadastro" : "Identificação"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isRegisterMode
                  ? "Número não encontrado. Informe seu nome para se cadastrar."
                  : "Digite seu telefone para ver seus pedidos."}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Telefone *</Label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    value={dialogPhone}
                    disabled={isRegisterMode}
                    onChange={(e) => setDialogPhone(fmtPhone(e.target.value))}
                    className="pl-8 h-10"
                  />
                </div>
              </div>

              {isRegisterMode && (
                <div>
                  <Label className="text-xs">Seu nome *</Label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Nome completo"
                      value={dialogName}
                      onChange={(e) => setDialogName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDialogSubmit()}
                      className="pl-8 h-10"
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isRegisterMode && (
                <Button variant="outline" onClick={() => setIsRegisterMode(false)} className="flex-1">
                  Voltar
                </Button>
              )}
              <Button onClick={handleDialogSubmit} disabled={dialogLoading} className="flex-1 gap-2">
                {dialogLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {isRegisterMode ? "Cadastrar e entrar" : "Buscar pedidos"}
              </Button>
            </div>

            {!isRegisterMode && (
              <p className="text-center text-xs text-muted-foreground">
                Não tem cadastro?{" "}
                <button
                  onClick={() => setIsRegisterMode(true)}
                  className="text-primary underline"
                >
                  Cadastre-se aqui
                </button>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
