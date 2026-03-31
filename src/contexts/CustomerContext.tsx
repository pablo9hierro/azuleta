import { createContext, useContext, useState, useEffect } from "react";

export interface CustomerSession {
  name: string;
  phone: string;
}

interface CustomerContextValue {
  customer: CustomerSession | null;
  setCustomer: (c: CustomerSession | null) => void;
  clearCustomer: () => void;
}

const CustomerContext = createContext<CustomerContextValue>({
  customer: null,
  setCustomer: () => {},
  clearCustomer: () => {},
});

const LS_KEY = "azuzao_customer";

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomerState] = useState<CustomerSession | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setCustomer = (c: CustomerSession | null) => {
    setCustomerState(c);
    if (c) localStorage.setItem(LS_KEY, JSON.stringify(c));
    else localStorage.removeItem(LS_KEY);
  };

  const clearCustomer = () => setCustomer(null);

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, clearCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}
