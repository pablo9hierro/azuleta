import { useState, useEffect } from "react";

/**
 * Behaves exactly like useState but syncs with localStorage.
 * Reads the stored value on mount; writes on every change.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota exceeded or private mode — silently ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
