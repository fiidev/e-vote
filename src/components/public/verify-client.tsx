"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { verifyTokenAction } from "@/app/actions/voting";
import { voteErrorMessage } from "@/components/public/error-messages";
import { Button } from "@/components/ui/button";

const TOKEN_LENGTH = 8;

export function VerifyClient() {
  const [state, formAction, isPending] = useActionState(
    verifyTokenAction,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(TOKEN_LENGTH).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const [_submitCount, setSubmitCount] = useState(0);

  useEffect(() => {
    if (isPending) setSubmitCount((n) => n + 1);
  }, [isPending]);

  useEffect(() => {
    if (state?.error) {
      toast.error(voteErrorMessage(state.error), { id: "verify-error" });
    }
  }, [state?.error]);

  const token = digits.join("");

  const focusInput = (index: number) => {
    const clamped = Math.max(0, Math.min(index, TOKEN_LENGTH - 1));
    setActiveIndex(clamped);
    inputsRef.current[clamped]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < TOKEN_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === "Backspace") {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        focusInput(index - 1);
      } else {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      }
    } else if (key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (key === "ArrowRight" && index < TOKEN_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, TOKEN_LENGTH);

    if (!pasted) return;

    e.preventDefault();

    const next = Array(TOKEN_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    focusInput(Math.min(pasted.length, TOKEN_LENGTH - 1));
  };

  return (
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 p-6">
      <div className="relative w-full max-w-[1400px] min-h-[720px] rounded-[70px] overflow-hidden bg-orange-100">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-0 bottom-0 w-96 h-[618px] object-cover opacity-60"
        />

        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center">
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
            1
          </span>
          <div className="h-1 w-28 bg-ink" />
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-ink-muted text-xs font-bold">
            2
          </span>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[851px] px-6 flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-heading text-6xl font-bold text-cyan-950 tracking-wide text-center">
              Masukkan Token Voting
            </h1>
            <p className="font-heading text-xl font-light text-cyan-950 tracking-wide text-center max-w-[564px]">
              Silakan masukkan 8 digit token yang kamu dapat untuk memulai
              proses pemungutan suara.
            </p>
          </div>

          <form
            ref={formRef}
            action={formAction}
            className="flex flex-col items-center gap-8"
          >
            <div
              className="flex items-center justify-center gap-3"
              onPaste={handlePaste}
            >
              {digits.map((digit, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static 8-digit list
                <div key={i} className="contents">
                  {i === 4 && (
                    <span className="text-2xl font-bold text-cyan-950 select-none">
                      -
                    </span>
                  )}
                  <input
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e.key)}
                    onFocus={() => setActiveIndex(i)}
                    className={`w-16 h-20 text-center text-2xl font-bold rounded-lg border-2 outline-none transition-all ${
                      digit
                        ? "bg-cyan-950 text-white border-cyan-950"
                        : "bg-transparent text-cyan-950 border-cyan-950/20"
                    } ${
                      activeIndex === i
                        ? "ring-4 ring-cyan-950/30 scale-105"
                        : "hover:border-cyan-950/40"
                    }`}
                    aria-label={`Digit token ${i + 1}`}
                  />
                </div>
              ))}
            </div>

            <input type="hidden" name="token" value={token} />

            <Button
              type="submit"
              isDisabled={isPending || token.length < TOKEN_LENGTH}
              className="h-14 w-36 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900 disabled:opacity-40"
            >
              {isPending ? "Memeriksa…" : "Lanjut"}
            </Button>
          </form>

          <p className="text-base font-medium text-cyan-950 underline cursor-pointer hover:text-ink">
            Tidak memiliki token? Hubungi Panitia
          </p>
        </div>
      </div>
    </main>
  );
}
