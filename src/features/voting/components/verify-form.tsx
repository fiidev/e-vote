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
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 p-4 sm:p-6">
      <div className="relative w-full max-w-[1400px] min-h-[720px] rounded-[40px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-center shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          priority
          className="absolute left-0 bottom-0 w-96 h-[618px] object-cover opacity-60 pointer-events-none hidden md:block"
        />

        <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 z-10">
          <VotingStepper currentStep={1} />
        </div>

        <div className="w-full max-w-[851px] px-6 py-12 flex flex-col items-center gap-8 z-10">
          <div className="flex flex-col items-center gap-3">
            <h1 className="font-heading text-4xl sm:text-6xl font-bold text-cyan-950 tracking-wide text-center">
              Masukkan Token Voting
            </h1>
            <p className="font-heading text-base sm:text-xl font-light text-cyan-950 tracking-wide text-center max-w-[564px]">
              Silakan masukkan token voting yang kamu peroleh dari panitia
              pemilihan.
            </p>
          </div>

          <form
            action={formAction}
            className="flex flex-col items-center gap-6 w-full max-w-lg"
          >
            <div className="w-full flex flex-col items-center">
              <input
                type="text"
                name="token"
                value={tokenInput}
                onChange={handleInputChange}
                onPaste={handlePaste}
                placeholder="Masukkan Tokennya..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                maxLength={16}
                className="w-full h-20 text-center font-mono text-2xl sm:text-3xl font-bold tracking-widest uppercase rounded-2xl border-2 border-cyan-950/30 bg-white text-cyan-950 placeholder:text-cyan-950/25 placeholder:text-lg sm:placeholder:text-2xl focus:border-cyan-950 focus:ring-4 focus:ring-cyan-950/20 outline-none transition-all duration-200 shadow-sm"
                aria-label="Token Voting"
              />
            </div>

            <Button
              type="submit"
              isDisabled={isPending || !isTokenFilled}
              className="h-14 w-44 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900 disabled:opacity-40 transition-all duration-200 ease-out active:scale-95 hover:shadow-lg cursor-pointer"
            >
              {isPending ? "Memeriksa…" : "Lanjut"}
            </Button>
          </form>

          <p className="text-sm font-medium text-cyan-950 underline cursor-pointer hover:text-ink transition-colors">
            Tidak memiliki token? Hubungi Panitia
          </p>
        </div>
      </div>
    </main>
  );
}
