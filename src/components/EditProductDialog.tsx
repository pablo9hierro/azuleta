import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/store";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditProductDialog({ product, open, onClose, onUpdated }: EditProductDialogProps) {
  const { updateProduct } = useStore();
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    barcode: product?.barcode || "",
    price: product?.price || 0,
    stock: product?.stock || 0,
    imageUrl: product?.imageUrl || "",
    deliverable: product?.deliverable || false,
  });

  if (product && form.name !== product.name && form.description !== product.description) {
    setForm({
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      deliverable: product.deliverable,
    });
  }

  const handleSave = async () => {
    if (!product) return;
    try {
      await updateProduct(product.id, {
        name: form.name,
        description: form.description,
        barcode: form.barcode,
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        deliverable: form.deliverable,
      });
      toast.success("Produto atualizado!");
      onUpdated();
      onClose();
    } catch {
      toast.error("Erro ao atualizar produto");
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Código de Barras</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Estoque</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <Label>URL da Imagem</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.deliverable}
              onChange={(e) => setForm({ ...form, deliverable: e.target.checked })}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium">Produto com entrega disponível</span>
          </label>
          <Button onClick={handleSave} className="w-full">Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
