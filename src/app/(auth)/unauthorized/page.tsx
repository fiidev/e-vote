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
    <main className="min-h-dvh flex items-center justify-center bg-stone-100 p-3 sm:p-6 overflow-x-hidden">
      <div className="relative w-full max-w-[1400px] min-h-[580px] sm:min-h-[720px] rounded-[32px] sm:rounded-[70px] overflow-hidden bg-orange-100 flex flex-col items-center justify-between p-6 sm:p-12 shadow-sm">
        <Image
          src="/images/illustration-2-4003-205.png"
          alt=""
          width={384}
          height={618}
          className="absolute left-[-24px] sm:left-[-40px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-25 sm:opacity-30 lg:opacity-35 pointer-events-none select-none z-0"
        />

        <Image
          src="/images/illustration-1-4003-206.png"
          alt=""
          width={384}
          height={668}
          className="absolute right-[-20px] sm:right-[-30px] bottom-0 w-48 sm:w-64 lg:w-80 h-auto object-cover opacity-25 sm:opacity-30 lg:opacity-35 pointer-events-none select-none z-0"
        />

        <div className="w-full flex justify-center z-10">
          <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-600 shadow-sm">
            <ShieldAlert className="size-7 sm:size-8" aria-hidden />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-2xl px-2 sm:px-4 flex flex-col items-center text-center gap-4 sm:gap-6 my-auto py-6">
          <div className="space-y-2 sm:space-y-3">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold text-cyan-950 tracking-tight leading-tight">
              Akses Ditolak
            </h1>
            <p className="font-heading text-sm sm:text-lg md:text-xl font-light text-cyan-950/85 tracking-wide max-w-lg mx-auto">
              Akun Google yang kamu gunakan tidak memiliki izin akses ke
              dashboard administrator E-Pilketos.
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 max-w-lg">
            <p className="font-sans text-xs sm:text-sm font-semibold text-red-700">
              {displayError}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full justify-center">
            <Link
              href="/login"
              className="w-full sm:w-auto h-12 sm:h-14 px-8 inline-flex items-center justify-center rounded-full bg-cyan-950 text-white font-heading text-base sm:text-lg font-semibold tracking-wide hover:bg-cyan-900 transition-colors shadow-md"
            >
              <RefreshCw className="mr-2 size-4" aria-hidden />
              Coba Akun Lain
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto h-12 sm:h-14 px-8 inline-flex items-center justify-center rounded-full border-2 border-cyan-950 text-cyan-950 font-heading text-base sm:text-lg font-semibold tracking-wide hover:bg-cyan-900/10 transition-colors"
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden />
              Kembali ke Beranda
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-cyan-950/70 font-medium max-w-md">
            Jika kamu merupakan panitia resmi pemilihan, hubungi Super Admin
            untuk menambahkan email kamu ke daftar panitia.
          </p>
        </div>

        <div className="hidden sm:block" />
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
