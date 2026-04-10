// Mock data store - simulates database with static data
// Follows AbacatePay-compatible structure

export interface Product {
  id: string;
  name: string;
  description: string;
  barcode: string;
  price: number;
  stock: number;
  imageUrl: string;
  deliverable: boolean;
  createdAt: string;
  // NF-e supplemental fields
  ncm?: string;
  cfop?: string;
  unit?: string;
  productCode?: string;
}

export interface Sale {
  id: string;
  products: { productId: string; name: string; quantity: number; unitPrice: number }[];
  total: number;
  paymentMethod: "pix" | "credit" | "debit" | "local";
  status: "paid" | "cancelled";
  createdAt: string;
  customerName?: string;
  deliveryRequested?: boolean;
  deliveryCep?: string;
  deliveryNumber?: string;
  deliveryReference?: string;
}

// AbacatePay-compatible billing structure
export interface AbacatePayBilling {
  id: string;
  url: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "REFUNDED";
  devMode: boolean;
  methods: string[];
  products: { externalId: string; name: string; description: string; quantity: number; price: number }[];
  frequency: "ONE_TIME";
  returnUrl: string;
  completionUrl: string;
  createdAt: string;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&h=300&fit=crop";

let products: Product[] = [
  {
    id: "prod_001",
    name: "Martelo de Unha 27mm",
    description: "Martelo de unha em aço forjado, cabo de fibra de vidro",
    barcode: "7891234567890",
    price: 34.90,
    stock: 45,
    imageUrl: "https://images.unsplash.com/photo-1586864387789-628af9feed72?w=300&h=300&fit=crop",
    deliverable: false,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "prod_002",
    name: "Cimento CP-II 50kg",
    description: "Saco de cimento Portland CP-II, 50kg",
    barcode: "7891234567891",
    price: 38.50,
    stock: 120,
    imageUrl: "https://images.unsplash.com/photo-1590680093498-1b2c6eddd20c?w=300&h=300&fit=crop",
    deliverable: true,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "prod_003",
    name: "Tinta Acrílica 18L Branco",
    description: "Tinta acrílica para paredes internas e externas, cor branco neve",
    barcode: "7891234567892",
    price: 189.90,
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=300&h=300&fit=crop",
    deliverable: true,
    createdAt: "2024-01-16T10:00:00Z",
  },
  {
    id: "prod_004",
    name: "Parafuso Philips 4.5x40mm (100un)",
    description: "Caixa com 100 parafusos philips em aço zincado",
    barcode: "7891234567893",
    price: 22.90,
    stock: 200,
    imageUrl: PLACEHOLDER_IMAGE,
    deliverable: false,
    createdAt: "2024-01-17T10:00:00Z",
  },
  {
    id: "prod_005",
    name: "Chave de Fenda 1/4\"",
    description: "Chave de fenda ponta chata, cabo ergonômico",
    barcode: "7891234567894",
    price: 15.90,
    stock: 60,
    imageUrl: PLACEHOLDER_IMAGE,
    deliverable: false,
    createdAt: "2024-01-18T10:00:00Z",
  },
];

let sales: Sale[] = [
  {
    id: "sale_001",
    products: [
      { productId: "prod_001", name: "Martelo de Unha 27mm", quantity: 2, unitPrice: 34.90 },
      { productId: "prod_004", name: "Parafuso Philips 4.5x40mm (100un)", quantity: 3, unitPrice: 22.90 },
    ],
    total: 138.50,
    paymentMethod: "pix",
    status: "paid",
    createdAt: "2024-03-01T14:30:00Z",
    customerName: "João Silva",
  },
  {
    id: "sale_002",
    products: [
      { productId: "prod_002", name: "Cimento CP-II 50kg", quantity: 10, unitPrice: 38.50 },
    ],
    total: 385.00,
    paymentMethod: "pix",
    status: "paid",
    createdAt: "2024-03-05T09:15:00Z",
    customerName: "Maria Santos",
  },
  {
    id: "sale_003",
    products: [
      { productId: "prod_003", name: "Tinta Acrílica 18L Branco", quantity: 4, unitPrice: 189.90 },
      { productId: "prod_001", name: "Martelo de Unha 27mm", quantity: 1, unitPrice: 34.90 },
    ],
    total: 794.50,
    paymentMethod: "credit",
    status: "paid",
    createdAt: "2024-03-10T16:00:00Z",
  },
  {
    id: "sale_004",
    products: [
      { productId: "prod_005", name: "Chave de Fenda 1/4\"", quantity: 5, unitPrice: 15.90 },
    ],
    total: 79.50,
    paymentMethod: "debit",
    status: "paid",
    createdAt: "2024-03-15T11:00:00Z",
  },
];

let billings: AbacatePayBilling[] = [];

// --- Product CRUD ---
export function getProducts(): Product[] {
  return [...products];
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductByBarcode(barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}

export function addProduct(product: Omit<Product, "id" | "createdAt">): Product {
  const newProduct: Product = {
    ...product,
    id: `prod_${String(products.length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
  };
  products = [...products, newProduct];
  return newProduct;
}

export function addProducts(items: Omit<Product, "id" | "createdAt">[]): Product[] {
  return items.map((item) => addProduct(item));
}

export function updateProduct(id: string, updates: Partial<Omit<Product, "id" | "createdAt">>): Product | null {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...updates };
  products = [...products];
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const len = products.length;
  products = products.filter((p) => p.id !== id);
  return products.length < len;
}

// --- Sales ---
export function getSales(): Sale[] {
  return [...sales];
}

export function addSale(sale: Omit<Sale, "id" | "createdAt">): Sale {
  const newSale: Sale = {
    ...sale,
    id: `sale_${String(sales.length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
  };
  sales = [...sales, newSale];
  sale.products.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  });
  return newSale;
}

// --- AbacatePay Mock ---
export function createBilling(saleId: string, amount: number, productItems: AbacatePayBilling["products"]): AbacatePayBilling {
  const billing: AbacatePayBilling = {
    id: `bill_${String(billings.length + 1).padStart(3, "0")}`,
    url: `https://pay.abacatepay.com/mock/${saleId}`,
    amount: amount * 100,
    status: "PENDING",
    devMode: true,
    methods: ["PIX"],
    products: productItems,
    frequency: "ONE_TIME",
    returnUrl: window.location.origin,
    completionUrl: `${window.location.origin}/pedido-confirmado`,
    createdAt: new Date().toISOString(),
  };
  billings = [...billings, billing];
  return billing;
}

export function getBillings(): AbacatePayBilling[] {
  return [...billings];
}

// --- XML Parser ---
export function parseProductsFromXML(xmlString: string): Omit<Product, "id" | "createdAt">[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parsedProducts: Omit<Product, "id" | "createdAt">[] = [];

  const detElements = doc.querySelectorAll("det");

  if (detElements.length > 0) {
    detElements.forEach((det) => {
      const prod = det.querySelector("prod");
      if (prod) {
        const name = prod.querySelector("xProd")?.textContent || "Produto sem nome";
        const unit = prod.querySelector("uCom")?.textContent || "unidade";
        const cEAN = prod.querySelector("cEAN")?.textContent || "";
        const cProd = prod.querySelector("cProd")?.textContent || "";
        const barcode = cEAN && cEAN !== "SEM GTIN" ? cEAN : "";
        const price = parseFloat(prod.querySelector("vUnCom")?.textContent || "0");
        const ncm = prod.querySelector("NCM")?.textContent || "";
        const cfop = prod.querySelector("CFOP")?.textContent || "";

        parsedProducts.push({
          name,
          description: unit,
          barcode,
          price: price || 0,
          stock: 0,
          imageUrl: "",
          deliverable: false,
          ncm,
          cfop,
          unit,
          productCode: cProd,
        });
      }
    });
  } else {
    const productElements = doc.querySelectorAll("produto, product, item");
    productElements.forEach((el) => {
      const name = el.querySelector("nome, name, xProd")?.textContent || el.getAttribute("nome") || "Produto";
      const description = el.querySelector("descricao, description, desc")?.textContent || "unidade";
      const barcode = el.querySelector("codigoBarras, barcode, ean, cEAN")?.textContent || "";

      parsedProducts.push({
        name,
        description,
        barcode,
        price: 0,
        stock: 0,
        imageUrl: "",
        deliverable: false,
      });
    });
  }

  return parsedProducts;
}

// --- Report helpers ---
export function getReportData() {
  const allSales = getSales();
  const paidSales = allSales.filter((s) => s.status === "paid");
  const totalRevenue = paidSales.reduce((sum, s) => sum + s.total, 0);
  const totalSales = paidSales.length;
  const totalProducts = getProducts().length;
  const totalItemsSold = paidSales.reduce((sum, s) => sum + s.products.reduce((a, p) => a + p.quantity, 0), 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const byMethod = paidSales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = paidSales
    .flatMap((s) => s.products)
    .reduce((acc, p) => {
      acc[p.name] = (acc[p.name] || 0) + p.quantity;
      return acc;
    }, {} as Record<string, number>);

  return { totalRevenue, totalSales, totalProducts, totalItemsSold, avgTicket, byMethod, topProducts, allSales };
}
