const { JSDOM } = require('./node_modules/jsdom');
const JsBarcode = require('./node_modules/jsbarcode');
const fs = require('fs');
const path = require('path');

const products = [
  { barcode: '7891234567890', name: 'Martelo de Unha 27mm', price: 34.90 },
  { barcode: '7891234567891', name: 'Cimento CP-II 50kg', price: 38.50 },
  { barcode: '7891234567892', name: 'Tinta Acrilica 18L Branco', price: 189.90 },
  { barcode: '7891234567893', name: 'Parafuso Philips 100un', price: 22.90 },
  { barcode: '7891234567894', name: 'Chave de Fenda 1/4', price: 15.90 },
];

const outDir = 'C:\\Users\\pablo\\Downloads';

// HTML page with all barcodes together
let allHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Codigos de Barras - Azuzao da Construcao</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { color: #333; margin-bottom: 4px; font-size: 22px; }
    p { color: #666; margin-bottom: 24px; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 12px; border: 1px solid #ddd; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card svg { max-width: 100%; }
    .name { font-weight: bold; font-size: 14px; margin-top: 10px; color: #222; }
    .price { color: #666; font-size: 12px; margin-top: 2px; }
    .code { font-family: monospace; font-size: 11px; color: #999; margin-top: 2px; }
    .tip { background: #e8f4fd; border: 1px solid #b3d9f5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #1a6fa0; }
    @media print { body { background: white; } .tip { display: none; } }
  </style>
</head>
<body>
  <h1>Codigos de Barras para Teste</h1>
  <p>Azuzao da Construcao — PDV Scanner Test</p>
  <div class="tip">
    Abra o PDV em <strong>outra aba</strong>, clique em <strong>Abrir Camera</strong> e aponte para um dos codigos abaixo.
    Tambem pode digitar o numero no campo manual.
  </div>
  <div class="grid">
`;

products.forEach((p) => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><svg id="bc"></svg></body></html>');
  const svg = dom.window.document.getElementById('bc');

  JsBarcode(svg, p.barcode, {
    format: 'CODE128',
    width: 3,
    height: 100,
    displayValue: true,
    fontSize: 16,
    margin: 12,
    background: '#ffffff',
    lineColor: '#000000',
    xmlDocument: dom.window.document,
  });

  const svgContent = svg.outerHTML;

  // Individual SVG file
  const safeName = p.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const svgFile = path.join(outDir, 'barcode_' + safeName + '.svg');
  fs.writeFileSync(svgFile, svgContent, 'utf8');
  console.log('SVG salvo:', svgFile);

  // Add to HTML
  const priceFormatted = 'R$ ' + p.price.toFixed(2).replace('.', ',');
  allHtml += `
    <div class="card">
      ${svgContent}
      <div class="name">${p.name}</div>
      <div class="price">${priceFormatted}</div>
      <div class="code">${p.barcode}</div>
    </div>`;
});

allHtml += `
  </div>
</body>
</html>`;

const htmlFile = path.join(outDir, 'barcodes_azuzao.html');
fs.writeFileSync(htmlFile, allHtml, 'utf8');
console.log('HTML completo:', htmlFile);
console.log('Pronto! Abra o arquivo HTML no navegador para escanear.');
