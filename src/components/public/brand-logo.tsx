/** Logo E-PILKETOS — teks + ikon kotak suara (zero image asset). */
export function BrandLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };
  const text = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className={`inline-flex items-center justify-center rounded-[14px] bg-ink ${sizes[size]}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[55%] text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 12l2 2 4-4" />
          <rect x="3" y="4" width="18" height="16" rx="3" />
        </svg>
      </span>
      <span className={`font-heading font-bold tracking-tight text-ink ${text[size]}`}>
        E-PILKETOS
      </span>
    </div>
  );
}