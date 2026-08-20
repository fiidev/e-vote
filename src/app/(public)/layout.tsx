/** Layout kiosk publik (verify/vote/success) — placeholder Fase 3. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface">
      {children}
    </div>
  );
}