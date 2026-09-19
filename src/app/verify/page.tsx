import { VerifyForm } from "@/features/voting/components/verify-form";

/**
 * Halaman Verifikasi Token Kiosk.
 * Bersifat statis (SSG) — redirect session ditangani di edge proxy (src/proxy.ts).
 * Sangat optimal untuk di-cache oleh Cloudflare Edge CDN pada beban ribuan user.
 */
export default function VerifyPage() {
  return <VerifyForm />;
}
