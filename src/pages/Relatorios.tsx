import Layout from "@/components/Layout";
import { getReportData } from "@/data/store";
import { useStore } from "@/contexts/StoreContext";
import { BarChart3, DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(215, 80%, 22%)", "hsl(35, 95%, 55%)", "hsl(145, 63%, 42%)", "hsl(0, 72%, 51%)"];

export default function Relatorios() {
  // Subscribe to products so component re-renders when Supabase data loads
  const { products } = useStore();
  const report = getReportData();

  const paymentData = Object.entries(report.byMethod).map(([method, value]) => ({
    name: method === "pix" ? "PIX" : method === "credit" ? "Crédito" : "Débito",
    value,
  }));

  const topProductsData = Object.entries(report.topProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name: name.length > 20 ? name.substring(0, 20) + "..." : name, quantidade: qty }));

  const stats = [
    { label: "Receita Total", value: `R$ ${report.totalRevenue.toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-success" },
    { label: "Vendas Realizadas", value: report.totalSales, icon: ShoppingBag, color: "text-primary" },
    { label: "Produtos Cadastrados", value: products.length, icon: Package, color: "text-accent" },
    { label: "Ticket Médio", value: `R$ ${report.avgTicket.toFixed(2).replace(".", ",")}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-5xl">
        <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
          <BarChart3 size={28} className="text-primary" />
          Relatórios
        </h1>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={20} className={stat.color} />
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-extrabold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Top products chart */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-4 text-sm">Produtos Mais Vendidos</h3>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProductsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="hsl(215, 80%, 22%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </div>

          {/* Payment methods pie */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-4 text-sm">Receita por Método de Pagamento</h3>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name}>
                    {paymentData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </div>
        </div>

        {/* Sales table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Histórico de Vendas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">Itens</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Pagamento</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.allSales.map((sale) => (
                  <tr key={sale.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{sale.id}</td>
                    <td className="p-3">
                      {sale.products.map((p) => `${p.name} (${p.quantity}x)`).join(", ")}
                    </td>
                    <td className="p-3 hidden sm:table-cell capitalize">{sale.paymentMethod}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        sale.status === "paid"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {sale.status === "paid" ? "Pago" : "Cancelado"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">R$ {sale.total.toFixed(2).replace(".", ",")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
