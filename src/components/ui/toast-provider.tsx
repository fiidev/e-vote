"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{
        duration: 3500,
        className: "font-sans",
      }}
    />
  );
}
