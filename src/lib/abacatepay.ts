// AbacatePay API Integration
// Docs: https://abacatepay.readme.io/reference

const BASE_URL = "https://api.abacatepay.com/v1";

function getApiKey(): string {
  return import.meta.env.VITE_ABACATEPAY_API_KEY ?? "";
}

export interface AbacateProduct {
  externalId: string;
  name: string;
  description: string;
  quantity: number;
  price: number; // in cents
}

export interface AbacateCustomer {
  name?: string;
  cellphone?: string;
  email?: string;
  taxId?: string; // CPF/CNPJ
}

export interface CreateBillingParams {
  products: AbacateProduct[];
  returnUrl: string;
  completionUrl: string;
  customer?: AbacateCustomer;
  customerId?: string;
}

export interface AbacateBilling {
  id: string;
  url: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "REFUNDED";
  devMode: boolean;
  methods: string[];
  products: AbacateProduct[];
  frequency: "ONE_TIME";
  returnUrl: string;
  completionUrl: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AbacateResponse<T> {
  data: T;
  error: string | null;
}

// Checks if we have a real API key (not empty/placeholder)
export function isAbacatePayConfigured(): boolean {
  const key = getApiKey();
  return Boolean(key && key.length > 10 && !key.startsWith("SUA_"));
}

export async function createAbacateBilling(
  params: CreateBillingParams
): Promise<AbacateBilling> {
  const apiKey = getApiKey();
  if (!isAbacatePayConfigured()) {
    throw new Error("ABACATEPAY_NOT_CONFIGURED");
  }

  const body: Record<string, unknown> = {
    frequency: "ONE_TIME",
    methods: ["PIX"],
    products: params.products,
    returnUrl: params.returnUrl,
    completionUrl: params.completionUrl,
  };

  if (params.customerId) {
    body.customerId = params.customerId;
  } else if (params.customer) {
    body.customer = params.customer;
  }

  const res = await fetch(`${BASE_URL}/billing/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const json: AbacateResponse<AbacateBilling> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function getAbacateBilling(id: string): Promise<AbacateBilling> {
  const apiKey = getApiKey();

  const res = await fetch(`${BASE_URL}/billing/${id}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const json: AbacateResponse<AbacateBilling> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export async function listAbacateBillings(): Promise<AbacateBilling[]> {
  const apiKey = getApiKey();

  const res = await fetch(`${BASE_URL}/billing/list`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const json: AbacateResponse<AbacateBilling[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}
