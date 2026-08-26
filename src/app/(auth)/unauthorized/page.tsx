"use client";

import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("message") || searchParams.get("error");

  const displayError =
    errorParam === "FORBIDDEN" ||
    !errorParam ||
    errorParam.toLowerCase().includes("tidak memiliki akses")
      ? "Email kamu tidak terdaftar di daftar whitelist administrator."
      : errorParam;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 p-4 sm:p-6 overflow-hidden">
      <div className="relative w-full max-w-[1400px] min-h-[720px] h-[800px] rounded-[50px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-center">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-0 bottom-0 w-80 md:w-96 h-[618px] object-cover opacity-50 pointer-events-none select-none"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          className="absolute right-0 top-[100px] w-80 md:w-96 h-[668px] object-cover opacity-50 pointer-events-none select-none"
        />

        <div className="relative z-10 w-full max-w-[820px] px-6 flex flex-col items-center text-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-600 shadow-sm">
            <ShieldAlert className="size-10" aria-hidden />
          </div>

          <div className="space-y-3">
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-cyan-950 tracking-wide leading-tight">
              Akses Ditolak
            </h1>
            <p className="font-heading text-lg sm:text-xl md:text-2xl font-light text-cyan-950 tracking-wide max-w-[620px] mx-auto">
              Akun Google yang kamu gunakan tidak memiliki izin akses ke
              dashboard administrator E-Pilketos.
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-2.5 max-w-lg">
            <p className="font-sans text-xs sm:text-sm font-semibold text-red-700">
              {displayError}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Link
              href="/login"
              className="h-14 px-8 inline-flex items-center justify-center rounded-full bg-cyan-950 text-white font-heading text-lg font-semibold tracking-wide hover:bg-cyan-900 transition-all shadow-md"
            >
              <RefreshCw className="mr-2.5 size-5" aria-hidden />
              Coba Akun Lain
            </Link>

            <Link
              href="/"
              className="h-14 px-8 inline-flex items-center justify-center rounded-full border-2 border-cyan-950 text-cyan-950 font-heading text-lg font-semibold tracking-wide hover:bg-cyan-900/10 transition-all"
            >
              <ArrowLeft className="mr-2.5 size-5" aria-hidden />
              Kembali ke Beranda
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-cyan-950/70 font-medium pt-2 max-w-md">
            Jika kamu merupakan panitia resmi pemilihan, hubungi Super Admin
            untuk menambahkan email kamu ke daftar panitia.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedContent />
    </Suspense>
  );
}
