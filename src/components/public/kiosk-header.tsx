import { BrandLogo } from "@/components/public/brand-logo";
import { StepProgress } from "@/components/public/step-progress";

/** Header layout kiosk: logo + progress langkah. */
export function KioskHeader({ step }: { step?: 1 | 2 | 3 }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
      <BrandLogo size="sm" />
      {step && <StepProgress step={step} />}
    </header>
  );
}