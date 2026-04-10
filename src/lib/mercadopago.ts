// Mercado Pago integration — credit card payments via Checkout Pro
import { getMercadoPagoToken } from "./apiKeys";

export interface MPItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "BRL";
}

export function isMercadoPagoConfigured(): boolean {
  const token = getMercadoPagoToken();
  return Boolean(token && token.length > 10);
}

export async function createMPPreference(params: {
  items: MPItem[];
  externalReference?: string;
}): Promise<{ id: string; init_point: string }> {
  const accessToken = getMercadoPagoToken();
  if (!isMercadoPagoConfigured()) throw new Error("MP_NOT_CONFIGURED");

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: params.items,
      payment_methods: {
        // Only allow credit card
        excluded_payment_types: [
          { id: "ticket" },
          { id: "bank_transfer" },
          { id: "debit_card" },
          { id: "prepaid_card" },
        ],
        installments: 12,
      },
      back_urls: {
        success: `${window.location.origin}/?pago=true`,
        failure: `${window.location.origin}/?pago=false`,
        pending: `${window.location.origin}/`,
      },
      external_reference: params.externalReference,
      auto_return: "approved",
    }),
  });

  if (!res.ok) throw new Error(`MP_ERROR_${res.status}`);
  const data = await res.json();
  return { id: data.id, init_point: data.init_point };
}
