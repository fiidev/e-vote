"use client";

import { Check } from "lucide-react";

interface VotingStepperProps {
  currentStep: 1 | 2 | 3;
}

export function VotingStepper({ currentStep }: VotingStepperProps) {
  const steps = [
    { number: 1, label: "Verifikasi Token" },
    { number: 2, label: "Pilih Kandidat" },
    { number: 3, label: "Selesai" },
  ];

  return (
    <nav
      className="flex items-center justify-center"
      aria-label="Progres pemilihan"
    >
      {steps.map((step, index) => {
        const isDone = currentStep > step.number;
        const isActive = currentStep === step.number;
        const hasNext = index < steps.length - 1;
        const isNextPassed = currentStep > step.number;

        return (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-bold font-mono transition-colors duration-150 ${
                isDone || isActive
                  ? "bg-cyan-950 text-white shadow-xs"
                  : "bg-cyan-950/20 text-cyan-950"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? <Check className="size-3.5 stroke-[3]" /> : step.number}
            </div>

            {hasNext && (
              <div
                className={`h-1 w-16 sm:w-24 transition-colors duration-150 ${
                  isNextPassed ? "bg-cyan-950" : "bg-cyan-950/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
