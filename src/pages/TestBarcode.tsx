import { useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getProducts } from "@/data/store";
import { ScanBarcode, Info } from "lucide-react";

interface BarcodeItemProps {
  barcode: string;
  label: string;
  price: number;
}

function BarcodeItem({ barcode, label, price }: BarcodeItemProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: "EAN13",
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // fallback to CODE128 if EAN13 fails (wrong digit count)
        try {
          JsBarcode(svgRef.current, barcode, {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10,
          });
        } catch {/* ignore */}
      }
    });
  }, [barcode]);

  if (!barcode) return null;

  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <svg ref={svgRef} className="max-w-full" />
      <div className="text-center">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">R$ {price.toFixed(2).replace(".", ",")}</p>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">{barcode}</p>
      </div>
    </div>
  );
}

export default function TestBarcode() {
  const products = getProducts().filter((p) => p.barcode);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold flex items-center gap-2 mb-2">
            <ScanBarcode size={28} className="text-primary" />
            Códigos de Barras para Teste
          </h1>
          <p className="text-muted-foreground text-sm">
            Imprima ou exiba esta página na tela e escaneie com a câmera do PDV para testar a leitura.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8 flex gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">Como testar o escaner:</p>
            <ol className="list-decimal pl-4 space-y-0.5 text-xs">
              <li>Abra a página <strong>/pdv</strong> em outra aba ou dispositivo</li>
              <li>Clique em <strong>"Abrir Câmera"</strong> no PDV</li>
              <li>Aponte a câmera para um dos códigos de barras abaixo</li>
              <li>O produto será adicionado automaticamente ao carrinho</li>
              <li>Também pode digitar o número diretamente no campo de entrada manual</li>
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <BarcodeItem
              key={product.id}
              barcode={product.barcode}
              label={product.name}
              price={product.price}
            />
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-center text-muted-foreground py-20">
            Nenhum produto com código de barras cadastrado.
          </p>
        )}
      </div>
    </Layout>
  );
}
