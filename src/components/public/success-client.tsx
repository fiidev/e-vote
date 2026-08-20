"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/button";

/**
 * Langkah 3 — Sukses.
 * Auto-redirect ke landing setelah 8 detik (countdown tampil di tombol).
 * Session sudah di-clear oleh castVoteAction sebelum redirect ke sini.
 */
export function SuccessClient() {
  const [seconds, setSeconds] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          clearInterval(timer);
          window.location.replace("/");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex size-20 items-center justify-center rounded-full bg-ink">
        <svg
          viewBox="0 0 24 24"
          className="size-10 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Suara Tercatat!
        </h1>
        <p className="max-w-sm text-sm text-ink-muted">
          Terima kasih sudah menggunakan hak suaramu. Hasil pemilihan akan
          diumumkan oleh panitia.
        </p>
      </div>

      <LinkButton
        href="/"
        variant="outline"
        className="h-12 rounded-full px-8"
      >
        Kembali ke Awal {seconds > 0 ? `(${seconds}s)` : ""}
      </LinkButton>
    </div>
  );
}