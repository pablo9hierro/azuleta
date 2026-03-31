import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, PackagePlus, BarChart3, ScanBarcode, ShoppingBag, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { Button } from "@/components/ui/button";

const publicNavItems = [
  { to: "/", label: "Loja", icon: Home },
];

const lojistaNavItems = [
  { to: "/produtos", label: "Produtos", icon: PackagePlus },
  { to: "/pdv", label: "PDV", icon: ScanBarcode },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { customer } = useCustomer();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Desktop nav items
  const desktopNavItems = user ? [...publicNavItems, ...lojistaNavItems] : publicNavItems;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center font-extrabold text-accent-foreground text-lg">
              A
            </div>
            <span className="font-extrabold text-lg hidden sm:inline">Azuzão da Construção</span>
          </Link>

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

            {/* Meus Pedidos — shown if customer has a session */}
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

            {/* Lojista: logout button */}
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

            {/* Login link for lojista (hidden when already logged in or when customer is browsing) */}
            {!user && !customer && (
              <Link
                to="/login"
                className="text-primary-foreground/50 hover:text-primary-foreground/80 text-xs px-2 py-1 rounded transition-colors"
              >
                Lojista
              </Link>
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

          {customer && !user && (
            <Link
              to="/meus-pedidos"
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                location.pathname === "/meus-pedidos" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <ShoppingBag size={20} />
              Pedidos
            </Link>
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
    </div>
  );
}
