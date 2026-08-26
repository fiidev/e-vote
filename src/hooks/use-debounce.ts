"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook untuk men-debounce nilai (misal: input pencarian).
 * Mencegah pemanggilan query berulang di setiap ketukan keyboard.
 *
 * @param value Nilai yang ingin di-debounce
 * @param delay Waktu tunda dalam milidetik (default: 300ms)
 * @returns Nilai yang telah di-debounce
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
