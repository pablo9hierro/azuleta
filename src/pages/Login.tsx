import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, HardHat } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/pdv";

  // Already logged in
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito a funcionários autorizados.
        </p>
      </div>
    </div>
  );
}
