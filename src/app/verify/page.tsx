import type { Metadata } from "next";
import { VerifyForm } from "@/features/voting/components/verify-form";

export const metadata: Metadata = {
  title: "Verifikasi Token Voting",
  description:
    "Masukkan kode token unik pemilihan untuk mengakses bilik suara dan menyalurkan hak suara Anda.",
};

/**
 * Halaman Verifikasi Token Kiosk.
 * Bersifat statis (SSG) — redirect session ditangani di edge proxy (src/proxy.ts).
 * Sangat optimal untuk di-cache oleh Cloudflare Edge CDN pada beban ribuan user.
 */
export default function VerifyPage() {
  return <VerifyForm />;
}
