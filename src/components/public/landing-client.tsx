"use client";

import Image from "next/image";
import { LinkButton } from "@/components/ui/button";

export function LandingClient() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 overflow-hidden">
      <div className="relative w-full max-w-[1400px] h-[800px] rounded-[70px] overflow-hidden mx-6">
        <div className="absolute inset-0 bg-orange-100 rounded-[70px]" />

        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-0 bottom-0 w-96 h-[618px] object-cover"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          className="absolute right-0 top-[132px] w-96 h-[668px] object-cover"
        />

        <div className="absolute top-[88px] left-1/2 -translate-x-1/2">
          <Image
            src="/images/image-1-4004-246.png"
            alt="Logo E-Pilketos"
            width={128}
            height={128}
            className="size-32 object-cover rounded-full"
          />
        </div>

        <div className="absolute left-1/2 top-[230px] -translate-x-1/2 w-[640px] text-center flex flex-col items-center gap-4">
          <h1 className="font-heading text-7xl font-bold text-cyan-950 tracking-wide leading-tight">
            Saatnya Suaramu Jadi Penentu!
          </h1>
          <p className="font-heading text-2xl text-cyan-950 tracking-wide max-w-[564px]">
            Jangan cuma jadi penonton. Yuk, pilih pemimpin OSIS yang siap
            wujudkan ide-ide seru kamu di sekolah!
          </p>
          <LinkButton
            href="/verify"
            className="mt-4 h-14 px-10 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900"
          >
            Ayo Pilih
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
