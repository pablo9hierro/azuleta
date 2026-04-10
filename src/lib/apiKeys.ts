/** Persistent API key storage — localStorage takes priority over env vars */

export function getAbacatePayKey(): string {
  return localStorage.getItem("apikey_abacatepay") || (import.meta.env.VITE_ABACATEPAY_API_KEY as string) || "";
}

export function getMercadoPagoToken(): string {
  return localStorage.getItem("apikey_mercadopago") || (import.meta.env.VITE_MP_ACCESS_TOKEN as string) || "";
}

export function setAbacatePayKey(key: string): void {
  if (key.trim()) localStorage.setItem("apikey_abacatepay", key.trim());
  else localStorage.removeItem("apikey_abacatepay");
}

export function setMercadoPagoToken(token: string): void {
  if (token.trim()) localStorage.setItem("apikey_mercadopago", token.trim());
  else localStorage.removeItem("apikey_mercadopago");
}
