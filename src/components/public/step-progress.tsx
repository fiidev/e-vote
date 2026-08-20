/** Progress 3 langkah kiosk: Verifikasi → Memilih → Selesai. */
export function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Verifikasi" },
    { id: 2, label: "Memilih" },
    { id: 3, label: "Selesai" },
  ] as const;

  return (
    <ol
      aria-label="Langkah voting"
      className="flex items-center gap-2"
    >
      {steps.map((s, index) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full transition-colors ${
              s.id <= step ? "bg-dot" : "bg-dot-inactive border border-line"
            }`}
            aria-hidden="true"
          />
          {index < steps.length - 1 && (
            <span className="h-px w-6 bg-line" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}