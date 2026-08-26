"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LinkButton } from "@/components/ui/button";

export function SuccessClient() {
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

  // Redirect ketika countdown habis
  useEffect(() => {
    if (seconds === 0) {
      router.replace("/");
    }
  }, [seconds, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 overflow-hidden">
      <div className="relative w-full max-w-[1400px] h-[800px] rounded-[70px] overflow-hidden mx-6">
        <div className="absolute inset-0 bg-orange-100 rounded-[70px]" />

        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          priority
          className="absolute left-0 top-[186px] w-96 h-[618px] object-cover"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          priority
          className="absolute right-[26px] top-[132px] w-96 h-[668px] object-cover"
        />

        <div className="absolute left-1/2 top-[230px] -translate-x-1/2 w-[640px] text-center flex flex-col items-center gap-0">
          <h1 className="font-heading text-7xl font-bold text-cyan-950 tracking-wide leading-tight">
            Suara kamu udah aman, mantap!
          </h1>
          <p className="font-heading text-2xl font-normal text-cyan-950 tracking-wide max-w-[564px] mt-[183px]">
            Makasih udah ikutan voting. Pilihan kamu bikin langkah kita
            selanjutnya makin jelas.
          </p>
          <LinkButton
            href="/"
            className="mt-[306px] h-14 w-72 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900"
          >
            Kembali Ke Beranda {seconds > 0 ? `(${seconds}s)` : ""}
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
