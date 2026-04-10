import { useState } from "react";
import type { Product } from "@/data/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUp, Check } from "lucide-react";

type ParsedProduct = Omit<Product, "id" | "createdAt">;

interface EditRow {
  alias: string;    // display name (apelido)
  price: string;    // editable string
  stock: string;    // editable quantity
}

interface Props {
  open: boolean;
  products: ParsedProduct[];
  onConfirm: (products: ParsedProduct[]) => void;
  onCancel: () => void;
}

export default function XmlImportDialog({ open, products, onConfirm, onCancel }: Props) {
  const [rows, setRows] = useState<EditRow[]>(() =>
    products.map((p) => ({
      alias: p.alias || "",
      price: p.price > 0 ? p.price.toFixed(2) : "",
      stock: p.stock > 0 ? String(p.stock) : "",
    }))
  );

  // Re-init rows when products change (new upload)
  // We key the dialog by products.length so it remounts on each new upload

  const setRow = (i: number, partial: Partial<EditRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...partial } : r)));

  const handleConfirm = () => {
    const merged: ParsedProduct[] = products.map((p, i) => ({
      ...p,
      alias: rows[i].alias.trim() || undefined,
      price: parseFloat(rows[i].price.replace(",", ".")) || 0,
      stock: parseInt(rows[i].stock) || 0,
    }));
    onConfirm(merged);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <FileUp size={20} className="text-primary" />
          <div>
            <h2 className="font-bold text-base">Importar Produtos do XML</h2>
            <p className="text-xs text-muted-foreground">
              {products.length} produto{products.length !== 1 ? "s" : ""} encontrado{products.length !== 1 ? "s" : ""}.
              Revise e preencha os campos editáveis antes de importar.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Código</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Nome Original (NF-e)</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap text-primary">
                  Apelido (nome exibido) ✏️
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">NCM</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">CFOP</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Unidade</th>
                <th className="text-right px-3 py-2.5 font-semibold text-xs whitespace-nowrap text-primary">
                  Preço ✏️
                </th>
                <th className="text-right px-3 py-2.5 font-semibold text-xs whitespace-nowrap text-primary">
                  Qtd. Estoque ✏️
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {p.productCode || p.barcode || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[180px]">
                    <span className="text-xs text-muted-foreground line-clamp-2" title={p.name}>
                      {p.name}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={rows[i].alias}
                      onChange={(e) => setRow(i, { alias: e.target.value })}
                      placeholder={p.name}
                      className="h-8 text-xs min-w-[140px]"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {p.ncm || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {p.cfop || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {p.unit || p.description || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rows[i].price}
                      onChange={(e) => setRow(i, { price: e.target.value })}
                      placeholder="0,00"
                      className="h-8 text-xs text-right min-w-[80px]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={rows[i].stock}
                      onChange={(e) => setRow(i, { stock: e.target.value })}
                      placeholder="0"
                      className="h-8 text-xs text-right min-w-[70px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-card">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Apelido</span>: o nome que aparecerá para clientes e no PDV.
            Deixe em branco para usar o nome original.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleConfirm} className="gap-2">
              <Check size={16} /> Importar {products.length} Produto{products.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
