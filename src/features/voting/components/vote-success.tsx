"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { VotingStepper } from "@/features/voting/components/voting-stepper";

export function VoteSuccess() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(8);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      router.replace("/");
    }
  }, [seconds, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-3 sm:p-6 overflow-x-hidden">
      <div className="relative w-full max-w-[1400px] min-h-[580px] sm:min-h-[720px] rounded-[32px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-between p-6 sm:p-12 shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          priority
          className="absolute left-[-24px] sm:left-[-40px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-20 sm:opacity-25 lg:opacity-30 pointer-events-none select-none z-0"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          priority
          className="absolute right-[-20px] sm:right-[-30px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-20 sm:opacity-25 lg:opacity-30 pointer-events-none select-none z-0"
        />

        <div className="w-full flex justify-center z-10">
          <VotingStepper currentStep={3} />
        </div>

        <div className="max-w-2xl px-4 text-center flex flex-col items-center gap-4 my-auto py-8 z-10">
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold text-cyan-950 tracking-tight leading-tight">
            Suara kamu udah aman, mantap!
          </h1>
          <p className="font-heading text-sm sm:text-lg md:text-xl font-light text-cyan-950/85 tracking-wide max-w-lg">
            Makasih udah ikutan voting. Pilihan kamu bikin langkah kita
            selanjutnya makin jelas.
          </p>
        </div>

        <div className="w-full flex justify-center z-10">
          <LinkButton
            href="/"
            className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-full bg-cyan-950 text-white font-heading text-base sm:text-lg font-semibold tracking-wide hover:bg-cyan-900 transition-colors shadow-md"
          >
            Kembali Ke Beranda {seconds > 0 ? `(${seconds}s)` : ""}
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
