import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, PackagePlus, BarChart3, ScanBarcode, ShoppingBag, LogOut,
  User, Phone, Mail, Loader2, Lock, HardHat, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCustomerByPhone, upsertCustomer } from "@/lib/supabase";
import { toast } from "sonner";

const publicNavItems = [
  { to: "/", label: "Loja", icon: Home },
];

const lojistaNavItems = [
  { to: "/produtos", label: "Produtos", icon: PackagePlus },
  { to: "/pdv", label: "PDV", icon: ScanBarcode },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length > 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0,2)}.${d.slice(2)}`;
  return d;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signIn, signUp, signOut } = useAuth();
  const { customer, setCustomer, clearCustomer } = useCustomer();

  // ── Auth modal state ─────────────────────────────────────────────────────
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"cliente" | "lojista" | "register">("cliente");

  // Customer tab
  const [custPhone, setCustPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custRegisterMode, setCustRegisterMode] = useState(false);

  // Lojista login tab
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register tab
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCnpj, setRegCnpj] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regEmailSent, setRegEmailSent] = useState(false);

  const openModal = (tab: "cliente" | "lojista" | "register" = "cliente") => {
    setAuthTab(tab);
    setCustPhone("");
    setCustName("");
    setCustRegisterMode(false);
    setLoginEmail("");
    setLoginPassword("");
    setRegName(""); setRegEmail(""); setRegPhone(""); setRegCnpj(""); setRegPassword(""); setRegEmailSent(false);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Customer identification
  const handleCustSubmit = async () => {
    const rawPhone = custPhone.replace(/\D/g, "");
    if (rawPhone.length < 10) { toast.error("Telefone inválido."); return; }
    setCustLoading(true);
    try {
      const existing = await getCustomerByPhone(rawPhone);
      if (existing && !custRegisterMode) {
        setCustomer({ name: existing.name, phone: rawPhone });
        setAuthModalOpen(false);
        navigate("/meus-pedidos");
      } else {
        if (!custRegisterMode) { setCustRegisterMode(true); setCustLoading(false); return; }
        if (!custName.trim()) { toast.error("Digite seu nome."); setCustLoading(false); return; }
        if (!existing) await upsertCustomer(custName.trim(), rawPhone);
        setCustomer({ name: custName.trim(), phone: rawPhone });
        toast.success(`Bem-vindo, ${custName.trim()}!`);
        setAuthModalOpen(false);
        navigate("/meus-pedidos");
      }
    } catch {
      toast.error("Erro ao identificar cliente.");
    } finally {
      setCustLoading(false);
    }
  };

  // Lojista login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setLoginLoading(true);
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    setLoginLoading(false);
    if (error) {
      toast.error("Credenciais inválidas.");
    } else {
      toast.success("Bem-vindo, lojista!");
      setAuthModalOpen(false);
      navigate("/pdv");
    }
  };

  // Lojista register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { toast.error("Informe seu nome."); return; }
    if (!regEmail.trim()) { toast.error("Informe seu e-mail."); return; }
    const rawPhone = regPhone.replace(/\D/g, "");
    if (rawPhone.length < 10) { toast.error("Telefone inválido."); return; }
    const rawCnpj = regCnpj.replace(/\D/g, "");
    if (rawCnpj.length !== 14) { toast.error("CNPJ inválido (14 dígitos)."); return; }
    if (regPassword.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres."); return; }
    setRegLoading(true);
    const { error, emailSent } = await signUp({ email: regEmail.trim(), password: regPassword, name: regName.trim(), phone: rawPhone, cnpj: regCnpj });
    setRegLoading(false);
    if (error) { toast.error("Erro: " + error); } else if (emailSent) { setRegEmailSent(true); }
  };

  const desktopNavItems = user ? [...publicNavItems, ...lojistaNavItems] : publicNavItems;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          {/* Left: logo + user icon */}
          <div className="flex items-center gap-2">
            {/* User icon / customer pill — shows on left */}
            {!user && !customer && (
              <button
                onClick={() => openModal("cliente")}
                className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                title="Entrar / Meus Pedidos"
              >
                <User size={18} className="text-primary-foreground/80" />
              </button>
            )}
            {customer && !user && (
              <button
                onClick={() => openModal("cliente")}
                className="flex items-center gap-1.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full px-2.5 py-1.5 transition-colors"
                title="Minha conta"
              >
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <User size={12} className="text-accent-foreground" />
                </div>
                <span className="text-sm font-semibold text-primary-foreground hidden sm:inline max-w-[90px] truncate">
                  {customer.name.split(" ")[0]}
                </span>
              </button>
            )}

            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center font-extrabold text-accent-foreground text-lg">
                A
              </div>
              <span className="font-extrabold text-lg hidden sm:inline">Azuzão da Construção</span>
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}

            {customer && !user && (
              <Link
                to="/meus-pedidos"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === "/meus-pedidos"
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                <ShoppingBag size={18} />
                <span className="hidden md:inline">Meus Pedidos</span>
              </Link>
            )}

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1.5"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Sair</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-2">
          {publicNavItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}

          {/* User icon in bottom nav for mobile when no session */}
          {!user && (
            <button
              onClick={() => openModal(customer ? "cliente" : "cliente")}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                location.pathname === "/meus-pedidos" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {customer ? <ShoppingBag size={20} /> : <User size={20} />}
              {customer ? "Pedidos" : "Entrar"}
            </button>
          )}

          {user && lojistaNavItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Unified Auth Modal ─────────────────────────────────────────────── */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as typeof authTab)}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="lojista">Lojista</TabsTrigger>
              <TabsTrigger value="register">Criar conta</TabsTrigger>
            </TabsList>

            {/* ── CLIENTE TAB ── */}
            <TabsContent value="cliente" className="space-y-4">
              {customer ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtPhone(customer.phone)}</p>
                    </div>
                  </div>
                  <Button className="w-full gap-2" onClick={() => { setAuthModalOpen(false); navigate("/meus-pedidos"); }}>
                    <ShoppingBag size={16} /> Ver Meus Pedidos
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => { clearCustomer(); setCustPhone(""); setCustName(""); setCustRegisterMode(false); }}>
                    <LogOut size={16} /> Sair da conta
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {custRegisterMode ? "Número não encontrado. Informe seu nome." : "Digite seu telefone para acessar seus pedidos."}
                  </p>
                  <div>
                    <Label className="text-xs">Telefone *</Label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="(11) 99999-9999"
                        value={custPhone}
                        disabled={custRegisterMode}
                        onChange={(e) => setCustPhone(fmtPhone(e.target.value))}
                        className="pl-8 h-10"
                        onKeyDown={(e) => e.key === "Enter" && handleCustSubmit()}
                      />
                    </div>
                  </div>
                  {custRegisterMode && (
                    <div>
                      <Label className="text-xs">Seu nome *</Label>
                      <Input
                        placeholder="Nome completo"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCustSubmit()}
                        autoFocus
                        className="h-10"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    {custRegisterMode && (
                      <Button variant="outline" className="flex-1" onClick={() => setCustRegisterMode(false)}>Voltar</Button>
                    )}
                    <Button className="flex-1 gap-2" onClick={handleCustSubmit} disabled={custLoading}>
                      {custLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {custRegisterMode ? "Cadastrar" : "Buscar pedidos"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── LOJISTA TAB ── */}
            <TabsContent value="lojista">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="flex flex-col items-center gap-1 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                    <HardHat size={24} className="text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Acesso exclusivo para lojistas</p>
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" placeholder="demo@demo.com.br" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-8 h-10" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Senha</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-8 h-10" />
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loginLoading}>
                  {loginLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Entrar
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Demo: demo@demo.com.br / demo123456
                </p>
              </form>
            </TabsContent>

            {/* ── REGISTER TAB ── */}
            <TabsContent value="register">
              {regEmailSent ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle2 size={40} className="mx-auto text-green-500" />
                  <p className="font-semibold">Verifique seu e-mail!</p>
                  <p className="text-sm text-muted-foreground">Um link de confirmação foi enviado para <strong>{regEmail}</strong>.</p>
                  <Button variant="outline" className="w-full" onClick={() => { setRegEmailSent(false); setAuthTab("lojista"); }}>
                    Ir para o login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <Label className="text-xs">Nome completo *</Label>
                    <Input placeholder="João Silva" value={regName} onChange={(e) => setRegName(e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail *</Label>
                    <Input type="email" placeholder="seu@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone *</Label>
                    <Input type="tel" inputMode="tel" placeholder="(11) 99999-9999" value={regPhone} onChange={(e) => setRegPhone(fmtPhone(e.target.value))} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs">CNPJ *</Label>
                    <Input inputMode="numeric" placeholder="00.000.000/0000-00" value={regCnpj} onChange={(e) => setRegCnpj(fmtCnpj(e.target.value))} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs">Senha *</Label>
                    <Input type="password" placeholder="Min. 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="h-10" />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={regLoading}>
                    {regLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Criar conta
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
