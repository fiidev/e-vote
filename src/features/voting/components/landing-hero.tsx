"use client";

import Image from "next/image";
import { LinkButton } from "@/components/ui/button";

export function LandingHero() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-3 sm:p-6 overflow-x-hidden">
      <div className="relative w-full max-w-[1400px] min-h-[580px] sm:min-h-[720px] rounded-[32px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-between p-6 sm:p-12 shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          priority
          className="absolute left-[-24px] sm:left-[-40px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-25 sm:opacity-30 lg:opacity-40 pointer-events-none select-none z-0"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          priority
          className="absolute right-[-20px] sm:right-[-30px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-25 sm:opacity-30 lg:opacity-40 pointer-events-none select-none z-0"
        />

        <div className="w-full flex justify-center z-10">
          <Image
            src="/images/logo-telkom-schools.png"
            alt="Logo Telkom Schools"
            width={160}
            height={160}
            priority
            className="size-14 sm:size-18 object-contain"
          />
        </div>

        <div className="max-w-2xl px-2 sm:px-4 text-center flex flex-col items-center gap-4 sm:gap-6 my-auto py-8 z-10">
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-cyan-950 tracking-tight leading-tight">
            Saatnya Suaramu Jadi Penentu!
          </h1>
          <p className="font-heading text-sm sm:text-lg md:text-xl font-light text-cyan-950/85 tracking-wide max-w-lg">
            Jangan cuma jadi penonton. Yuk, pilih pemimpin organisasi dan
            suborganisasi sekolah yang siap wujudkan ide-ide seru kamu!
          </p>
          <LinkButton
            href="/verify"
            className="w-full sm:w-auto h-12 sm:h-14 px-10 rounded-full bg-cyan-950 text-white font-heading text-lg sm:text-xl font-semibold tracking-wide hover:bg-cyan-900 transition-colors shadow-md"
          >
            Ayo Pilih ➔
          </LinkButton>
        </div>

        <div className="hidden sm:block" />
      </div>
    </main>
  );
}
