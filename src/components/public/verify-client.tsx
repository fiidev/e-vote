"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { verifyTokenAction } from "@/app/actions/voting";
import type { VoteActionState } from "@/app/actions/voting";
import { ErrorAlert } from "@/components/public/error-alert";

/**
 * Langkah 1 — Verifikasi token.
 * OtpInput 2 grup (XXXX-XXXX) + auto-submit saat 8 digit lengkap.
 * Error domain dirender lewat ErrorAlert (peta VoteErrorCode).
 */
export function VerifyClient() {
  const [state, formAction, isPending] = useActionState(
    verifyTokenAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Masukkan Token
        </h1>
        <p className="text-sm text-ink-muted">
          Token 8 digit dikirim ke email kamu oleh panitia.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="token" className="text-sm font-medium text-ink">
          Token Voting
        </Label>
        <TokenInput
          name="token"
          onComplete={() => formRef.current?.requestSubmit()}
        />
      </div>

      {state?.error && <ErrorAlert code={state.error} />}

      <Button type="submit" isDisabled={isPending} className="h-12 rounded-full">
        {isPending ? "Memeriksa…" : "Verifikasi"}
      </Button>
    </form>
  );
}

/**
 * Input token 8 digit: 2 grup 4 digit + separator.
 * Value disinkronkan ke hidden input (name="token") agar ikut FormData.
 * Tidak dinormalisasi di client — parser server (verifyTokenSchema)
 * menerima format `48219037` maupun `4821-9037`.
 */
function TokenInput({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [value, setValue] = useState("");

  return (
    <>
      <InputOTP
        maxLength={8}
        value={value}
        onChange={setValue}
        pattern="\d+"
        autoFocus
        onComplete={onComplete}
        inputMode="numeric"
        aria-label="Token voting 8 digit"
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
          <InputOTPSlot index={6} />
          <InputOTPSlot index={7} />
        </InputOTPGroup>
      </InputOTP>
      <input type="hidden" name={name} value={value} />
    </>
  );
}