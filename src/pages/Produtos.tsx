import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import EditProductDialog from "@/components/EditProductDialog";
import XmlImportDialog from "@/components/XmlImportDialog";
import { getProducts, addProduct, addProducts, parseProductsFromXML, deleteProduct, type Product } from "@/data/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, Pencil, Trash2, FileUp, Package, Search, Truck } from "lucide-react";
import { toast } from "sonner";

export default function Produtos() {
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [manualForm, setManualForm] = useState({
    name: "", description: "", barcode: "", price: "", stock: "", imageUrl: "", deliverable: false,
  });

  type ParsedProduct = Omit<Product, "id" | "createdAt">;
  const [xmlDialogOpen, setXmlDialogOpen] = useState(false);
  const [xmlParsed, setXmlParsed] = useState<ParsedProduct[]>([]);

  const products = getProducts();
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
  );

  const handleManualAdd = () => {
    if (!manualForm.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    addProduct({
      name: manualForm.name,
      description: manualForm.description || "unidade",
      barcode: manualForm.barcode,
      price: parseFloat(manualForm.price) || 0,
      stock: parseInt(manualForm.stock) || 0,
      imageUrl: manualForm.imageUrl,
      deliverable: manualForm.deliverable,
    });
    setManualForm({ name: "", description: "", barcode: "", price: "", stock: "", imageUrl: "", deliverable: false });
    setRefresh((r) => r + 1);
    toast.success("Produto cadastrado!");
  };

  const handleXMLUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseProductsFromXML(text);
        if (parsed.length === 0) {
          toast.error("Nenhum produto encontrado no XML. Verifique o formato.");
          return;
        }
        setXmlParsed(parsed);
        setXmlDialogOpen(true);
        toast.success(`${parsed.length} produtos encontrados no XML!`);
      } catch {
        toast.error("Erro ao processar o XML.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImportXML = (products: ParsedProduct[]) => {
    addProducts(products);
    setXmlDialogOpen(false);
    setXmlParsed([]);
    setRefresh((r) => r + 1);
    toast.success(`${products.length} produto${products.length !== 1 ? "s" : ""} importado${products.length !== 1 ? "s" : ""} com sucesso!`);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setRefresh((r) => r + 1);
    toast.success("Produto removido");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-5xl">
        <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
          <Package size={28} className="text-primary" />
          Gerenciar Produtos
        </h1>

        <Tabs defaultValue="xml" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="xml" className="gap-1.5">
              <FileUp size={16} /> Importar XML
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <Plus size={16} /> Cadastro Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xml">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div>
                <Label className="text-base font-semibold mb-2 block">Upload de Arquivo XML</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Envie o XML (NFe ou catálogo) para importar produtos automaticamente.
                </p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <Upload size={40} className="text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Clique ou arraste o arquivo XML</span>
                  <span className="text-xs text-muted-foreground mt-1">Suporta NFe e catálogos genéricos</span>
                  <input type="file" accept=".xml" className="hidden" onChange={handleXMLUpload} />
                </label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Produto *</Label>
                  <Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Ex: Martelo de Unha" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} placeholder="Ex: 1 unidade" />
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Input value={manualForm.barcode} onChange={(e) => setManualForm({ ...manualForm, barcode: e.target.value })} placeholder="Ex: 7891234567890" />
                </div>
                <div>
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" value={manualForm.price} onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })} placeholder="0,00" />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input type="number" value={manualForm.stock} onChange={(e) => setManualForm({ ...manualForm, stock: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>URL da Imagem</Label>
                  <Input value={manualForm.imageUrl} onChange={(e) => setManualForm({ ...manualForm, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.deliverable}
                  onChange={(e) => setManualForm({ ...manualForm, deliverable: e.target.checked })}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <Truck size={14} className="text-primary" />
                <span className="text-sm font-medium">Produto com entrega disponível</span>
              </label>
              <Button onClick={handleManualAdd} className="gap-2">
                <Plus size={16} /> Cadastrar Produto
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Products list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Produtos Cadastrados ({products.length})</h2>
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Produto</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Descrição</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Cód. Barras</th>
                    <th className="text-right p-3 font-medium">Preço</th>
                    <th className="text-right p-3 font-medium">Estoque</th>
                    <th className="text-center p-3 font-medium">Entrega</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{product.alias || product.name}</p>
                        {product.alias && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={product.name}>
                            NFe: {product.name}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{product.description}</td>
                      <td className="p-3 font-mono text-xs hidden md:table-cell">{product.barcode || "—"}</td>
                      <td className="p-3 text-right font-semibold">R$ {product.price.toFixed(2).replace(".", ",")}</td>
                      <td className="p-3 text-right">{product.stock}</td>
                      <td className="p-3 text-center">
                        {product.deliverable ? (
                          <Truck size={16} className="inline text-primary" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setEditProduct(product); setEditOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 rounded-lg hover:bg-muted text-destructive transition-colors"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum produto encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <EditProductDialog
        product={editProduct}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditProduct(null); }}
        onUpdated={() => setRefresh((r) => r + 1)}
      />

      {xmlDialogOpen && (
        <XmlImportDialog
          key={xmlParsed.length + xmlParsed[0]?.name}
          open={xmlDialogOpen}
          products={xmlParsed}
          onConfirm={handleImportXML}
          onCancel={() => { setXmlDialogOpen(false); setXmlParsed([]); }}
        />
      )}
    </Layout>
  );
}
