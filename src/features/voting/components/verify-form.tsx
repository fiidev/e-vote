"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verifyTokenAction } from "@/features/voting/actions";
import { voteErrorMessage } from "@/features/voting/error-messages";

/**
 * Format string mentah menjadi format token standar: [PREFIX]-[BLOCK1]-[BLOCK2]
 * Contoh: "mtc2dqtg7p2" -> "MTC-2DQT-G7P2"
 */
function formatTokenInput(raw: string): string {
  // Hanya ambil huruf dan angka, ubah ke uppercase
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (cleaned.length <= 3) {
    return cleaned;
  }
  if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

import { VotingStepper } from "@/features/voting/components/voting-stepper";

export function VerifyForm() {
  const [state, formAction, isPending] = useActionState(
    verifyTokenAction,
    undefined,
  );

  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (state?.error) {
      toast.error(voteErrorMessage(state.error), { id: "verify-error" });
    }
  }, [state?.error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTokenInput(e.target.value);
    setTokenInput(formatted);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const formatted = formatTokenInput(pasted);
    setTokenInput(formatted);
  };

  const isTokenFilled = tokenInput.replace(/[^A-Z0-9]/g, "").length >= 7;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 p-3 sm:p-6">
      <div className="relative w-full max-w-[1400px] min-h-[580px] sm:min-h-[720px] rounded-[32px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-between p-6 sm:p-12 shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          priority
          className="absolute left-[-24px] sm:left-[-40px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-25 sm:opacity-30 lg:opacity-40 pointer-events-none select-none z-0"
        />

        <div className="w-full flex justify-center z-10">
          <VotingStepper currentStep={1} />
        </div>

        <div className="w-full max-w-[851px] px-2 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-6 sm:gap-8 z-10 my-auto">
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold text-cyan-950 tracking-tight">
              Masukkan Token Voting
            </h1>
            <p className="font-heading text-sm sm:text-lg md:text-xl font-light text-cyan-950/80 tracking-wide max-w-[564px]">
              Silakan masukkan token voting yang kamu peroleh dari panitia
              pemilihan.
            </p>
          </div>

          <form
            action={formAction}
            className="flex flex-col items-center gap-5 sm:gap-6 w-full max-w-md"
          >
            <div className="w-full flex flex-col items-center">
              <input
                type="text"
                name="token"
                value={tokenInput}
                onChange={handleInputChange}
                onPaste={handlePaste}
                placeholder="MTC-XXXX-XXXX"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                maxLength={16}
                className="w-full h-16 sm:h-20 text-center font-mono text-xl sm:text-3xl font-bold tracking-widest uppercase rounded-2xl border-2 border-cyan-950/30 bg-white text-cyan-950 placeholder:text-cyan-950/25 placeholder:text-base sm:placeholder:text-2xl focus:border-cyan-950 focus:ring-4 focus:ring-cyan-950/20 outline-none transition-all duration-200 shadow-sm"
                aria-label="Token Voting"
              />
            </div>

            <Button
              type="submit"
              isDisabled={isPending || !isTokenFilled}
              className="h-12 sm:h-14 w-full sm:w-44 rounded-full bg-cyan-950 text-white font-heading text-lg sm:text-xl font-semibold tracking-wide hover:bg-cyan-900 disabled:opacity-40 transition-colors duration-150 cursor-pointer shadow-md"
            >
              {isPending ? "Memeriksa…" : "Lanjut ➔"}
            </Button>
          </form>

          <p className="text-xs sm:text-sm font-medium text-cyan-950/80 underline cursor-pointer hover:text-cyan-950 transition-colors">
            Tidak memiliki token? Hubungi Panitia
          </p>
        </div>

        <div className="hidden sm:block" />
      </div>
    </main>
  );
}
