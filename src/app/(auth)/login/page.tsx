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
          <div className="flex size-20 items-center justify-center rounded-full bg-cyan-950 text-white shadow-md">
            <GraduationCap className="size-10" aria-hidden />
          </div>

          <div className="space-y-3">
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-cyan-950 tracking-wide leading-tight">
              E-Pilketos Admin
            </h1>
            <p className="font-heading text-lg sm:text-xl md:text-2xl font-light text-cyan-950 tracking-wide max-w-[560px] mx-auto">
              Masuk dengan akun Google sekolah untuk mengelola data pemilihan,
              kandidat, dan rekapitulasi suara.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onPress={handleSignIn}
              isDisabled={loading}
              className="h-14 px-10 rounded-full bg-cyan-950 text-white font-heading text-xl font-semibold tracking-wide hover:bg-cyan-900 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? "Mengarahkan ke Google…" : "Masuk dengan Google"}
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-cyan-950/70 font-medium pt-2">
            Hanya akun email terdaftar (@smktelkom-mlg.sch.id / whitelist) yang
            memiliki akses.
          </p>
        </div>
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
