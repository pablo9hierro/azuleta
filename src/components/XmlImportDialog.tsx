import { useState } from "react";
import type { Product } from "@/data/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUp, Check, RefreshCw, Sparkles } from "lucide-react";

type ParsedProduct = Omit<Product, "id" | "createdAt">;
export type UpsertProduct = Omit<Product, "id" | "createdAt"> & { existingId?: string };

interface EditRow {
  alias: string;
  price: string;
  stock: string;
}

interface EnrichedProduct {
  parsed: ParsedProduct;   // original XML data
  existingId?: string;     // if already in store
}

interface Props {
  open: boolean;
  products: ParsedProduct[];
  existingProducts: Product[];
  onConfirm: (products: UpsertProduct[]) => void;
  onCancel: () => void;
}

function matchExisting(p: ParsedProduct, existing: Product[]): Product | undefined {
  // Match by productCode first, then by barcode (non-empty)
  if (p.productCode) {
    const m = existing.find((e) => e.productCode && e.productCode === p.productCode);
    if (m) return m;
  }
  if (p.barcode) {
    const m = existing.find((e) => e.barcode && e.barcode === p.barcode);
    if (m) return m;
  }
  return undefined;
}

export default function XmlImportDialog({ open, products, existingProducts, onConfirm, onCancel }: Props) {
  // Enrich with existing matches, sort: duplicates first then new
  const enriched: EnrichedProduct[] = products.map((p) => {
    const found = matchExisting(p, existingProducts);
    return { parsed: p, existingId: found?.id };
  });
  const sorted = [
    ...enriched.filter((e) => e.existingId),   // existing first (amber)
    ...enriched.filter((e) => !e.existingId),   // new below (default)
  ];

  const existingCount = sorted.filter((e) => e.existingId).length;
  const newCount = sorted.length - existingCount;

  // Init edit rows: for existing products → use saved alias/price; for new → use XML values
  const [rows, setRows] = useState<EditRow[]>(() =>
    sorted.map(({ parsed, existingId }) => {
      if (existingId) {
        const saved = existingProducts.find((e) => e.id === existingId)!;
        return {
          alias: saved.alias || "",
          price: saved.price > 0 ? saved.price.toFixed(2) : (parsed.price > 0 ? parsed.price.toFixed(2) : ""),
          stock: String(parsed.stock > 0 ? parsed.stock : saved.stock),
        };
      }
      return {
        alias: parsed.alias || "",
        price: parsed.price > 0 ? parsed.price.toFixed(2) : "",
        stock: parsed.stock > 0 ? String(parsed.stock) : "",
      };
    })
  );

  const setRow = (i: number, partial: Partial<EditRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...partial } : r)));

  const handleConfirm = () => {
    const merged: UpsertProduct[] = sorted.map(({ parsed, existingId }, i) => ({
      ...parsed,
      alias: rows[i].alias.trim() || undefined,
      price: parseFloat(rows[i].price.replace(",", ".")) || 0,
      stock: parseInt(rows[i].stock) || 0,
      existingId,
    }));
    onConfirm(merged);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <FileUp size={20} className="text-primary" />
          <div className="flex-1">
            <h2 className="font-bold text-base">Importar Produtos do XML</h2>
            <p className="text-xs text-muted-foreground">
              {products.length} produto{products.length !== 1 ? "s" : ""} encontrado{products.length !== 1 ? "s" : ""}.
              Revise e preencha os campos editáveis antes de importar.
            </p>
          </div>
          {existingCount > 0 && (
            <div className="flex gap-2 text-xs shrink-0">
              <span className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
                <RefreshCw size={11} /> {existingCount} já cadastrado{existingCount !== 1 ? "s" : ""}
              </span>
              {newCount > 0 && (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full font-medium">
                  <Sparkles size={11} /> {newCount} novo{newCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap"></th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Código</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap">Nome Original (NF-e)</th>
                <th className="text-left px-3 py-2.5 font-semibold text-xs whitespace-nowrap text-primary">
                  Apelido ✏️
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
              {sorted.map(({ parsed, existingId }, i) => {
                const isDuplicate = !!existingId;
                const rowClass = isDuplicate
                  ? "border-t border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                  : "border-t border-border hover:bg-muted/30 transition-colors";
                return (
                  <tr key={i} className={rowClass}>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {isDuplicate ? (
                        <span title="Produto já cadastrado — será atualizado">
                          <RefreshCw size={13} className="text-amber-500" />
                        </span>
                      ) : (
                        <span title="Produto novo">
                          <Sparkles size={13} className="text-emerald-500" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {parsed.productCode || parsed.barcode || "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[180px]">
                      <span className="text-xs text-muted-foreground line-clamp-2" title={parsed.name}>
                        {parsed.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={rows[i].alias}
                        onChange={(e) => setRow(i, { alias: e.target.value })}
                        placeholder={parsed.name}
                        className="h-8 text-xs min-w-[140px]"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {parsed.ncm || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {parsed.cfop || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {parsed.unit || parsed.description || "—"}
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
                );
              })}
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
