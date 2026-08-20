"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LinkButton } from "@/components/ui/button";
import { BrandLogo } from "@/components/public/brand-logo";
import {
  FullscreenButton,
  useFullscreen,
} from "@/components/public/fullscreen-wrapper";

/**
 * Landing kiosk: hero + tombol mulai + fullscreen dengan guard.
 * Guard: dialog muncul saat keluar fullscreen (termasuk Esc) — kiosk mode
 * harus tetap di layar penuh supaya tidak ada akses ke tab lain.
 */
export function LandingClient() {
  const handle = useFullscreen();
  const [guardOpen, setGuardOpen] = useState(false);

  // Auto-enter fullscreen saat kiosk start (requestFullscreen butuh gestur
  // user di sebagian browser; di-cover tombol manual juga).
  useEffect(() => {
    void handle.enter();
  }, [handle]);

  // Guard: keluar fullscreen → tampilkan dialog.
  useEffect(
    () =>
      handle.subscribe((active) => {
        if (!active) setGuardOpen(true);
      }),
    [handle],
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size="lg" />
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            Pemilihan Ketua OSIS
            <br />
            SMK Telkom Malang
          </h1>
          <p className="max-w-xl text-base text-ink-muted sm:text-lg">
            Silakan mulai voting dengan memasukkan token yang sudah dikirim ke
            email kamu.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <LinkButton
            href="/verify"
            size="lg"
            className="h-14 rounded-full px-10 text-base"
          >
            Mulai Voting
          </LinkButton>
          <FullscreenButton handle={handle} />
        </div>
      </div>

      <AlertDialog isOpen={guardOpen} onOpenChange={setGuardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mode Layar Penuh Dimatikan</AlertDialogTitle>
            <AlertDialogDescription>
              Kiosk voting berjalan dalam layar penuh agar pemilih fokus dan
              tidak mengakses aplikasi lain. Silakan kembali ke layar penuh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void handle.enter()}>
              Kembali ke Layar Penuh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}