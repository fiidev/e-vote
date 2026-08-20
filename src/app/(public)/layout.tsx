import { KioskHeader } from "@/components/public/kiosk-header";

/** Layout kiosk publik — no-store (token/voting harus selalu fresh). */
export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <KioskHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}