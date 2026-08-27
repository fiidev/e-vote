"use client";

import { GraduationCap } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth-client";

/**
 * Halaman login admin — Google OAuth.
 * Akses dibatasi: email sekolah (@smktelkom-mlg.sch.id) atau whitelist ADMIN_EMAILS
 * (dicek server-side di lib/auth.ts).
 */
function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const error = searchParams.get("error");
  useEffect(() => {
    if (error) {
      router.replace(`/unauthorized?error=${encodeURIComponent(error)}`);
    }
  }, [error, router]);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setLoading(false);
    }
  }

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
          <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-cyan-950 text-white shadow-md">
            <GraduationCap className="size-7 sm:size-8" aria-hidden />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-2xl px-2 sm:px-4 flex flex-col items-center text-center gap-4 sm:gap-6 my-auto py-6">
          <div className="space-y-2 sm:space-y-3">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl font-bold text-cyan-950 tracking-tight leading-tight">
              E-Pilketos Admin
            </h1>
            <p className="font-heading text-sm sm:text-lg md:text-xl font-light text-cyan-950/85 tracking-wide max-w-lg mx-auto">
              Masuk dengan akun Google sekolah untuk mengelola data pemilihan,
              kandidat, dan rekapitulasi suara.
            </p>
          </div>

          <div className="pt-2 w-full flex justify-center">
            <Button
              type="button"
              onPress={handleSignIn}
              isDisabled={loading}
              className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-cyan-950 text-white font-heading text-base sm:text-lg font-semibold tracking-wide hover:bg-cyan-900 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Mengarahkan ke Google…" : "Masuk dengan Google ➔"}
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-cyan-950/70 font-medium">
            Hanya akun email terdaftar (@smktelkom-mlg.sch.id / whitelist) yang
            memiliki akses.
          </p>
        </div>

        <div className="hidden sm:block" />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
