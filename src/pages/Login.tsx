import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, HardHat, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/pdv";

  const [tab, setTab] = useState<"login" | "register">("login");

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCnpj, setRegCnpj] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas. Verifique o e-mail e senha.");
    } else {
      toast.success("Bem-vindo, lojista!");
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { toast.error("Informe seu nome completo."); return; }
    if (!regEmail.trim()) { toast.error("Informe seu e-mail."); return; }
    const rawPhone = regPhone.replace(/\D/g, "");
    if (rawPhone.length < 10) { toast.error("Telefone inválido."); return; }
    const rawCnpj = regCnpj.replace(/\D/g, "");
    if (rawCnpj.length !== 14) { toast.error("CNPJ inválido (14 dígitos)."); return; }
    if (regPassword.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres."); return; }

    setRegLoading(true);
    const { error, emailSent: sent } = await signUp({
      email: regEmail.trim(),
      password: regPassword,
      name: regName.trim(),
      phone: rawPhone,
      cnpj: regCnpj,
    });
    setRegLoading(false);
    if (error) {
      toast.error("Erro ao criar conta: " + error);
    } else if (sent) {
      setEmailSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <HardHat size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-extrabold">Área do Lojista</h1>
          <p className="text-sm text-muted-foreground">Azuzão da Construção</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "login" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "register" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Criar conta
          </button>
        </div>

        {/* LOGIN */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                placeholder="loja@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs">Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Entrar
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Acesso restrito a funcionários autorizados.
            </p>
          </form>
        )}

        {/* REGISTER */}
        {tab === "register" && (
          emailSent ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Mail size={28} className="text-green-600" />
              </div>
              <h2 className="font-extrabold text-lg">Verifique seu e-mail!</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para{" "}
                <span className="font-semibold text-foreground">{regEmail}</span>.
                Clique no link para ativar sua conta.
              </p>
              <Button variant="outline" className="w-full mt-2" onClick={() => { setEmailSent(false); setTab("login"); }}>
                <CheckCircle2 size={15} className="mr-2" /> Já confirmei, entrar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <Label className="text-xs">Nome completo *</Label>
                <Input
                  placeholder="João da Silva"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">E-mail *</Label>
                <Input
                  type="email"
                  placeholder="voce@empresa.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Telefone *</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={regPhone}
                  onChange={(e) => setRegPhone(fmtPhone(e.target.value))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">CNPJ *</Label>
                <Input
                  inputMode="numeric"
                  placeholder="00.000.000/0001-00"
                  value={regCnpj}
                  onChange={(e) => setRegCnpj(fmtCnpj(e.target.value))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Senha *</Label>
                <Input
                  type="password"
                  placeholder="mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-10"
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={regLoading}>
                {regLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                Criar conta
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Você receberá um e-mail para confirmar seu cadastro.
              </p>
            </form>
          )
        )}
      </div>
    </div>
  );
}
