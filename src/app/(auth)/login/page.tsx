"use client";

import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signInWithGoogle } from "@/lib/auth-client";

/**
 * Halaman login admin — Google OAuth.
 * Akses dibatasi: email sekolah (@smktelkom-mlg.sch.id) atau whitelist ADMIN_EMAILS
 * (dicek server-side di lib/auth.ts).
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-sm border-line bg-card shadow-otp">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="size-6" aria-hidden />
          </div>
          <CardTitle className="text-xl text-ink">E-Pilketos Admin</CardTitle>
          <CardDescription className="text-ink-muted">
            Masuk untuk mengelola pemilihan ketua OSIS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <Button
            type="button"
            onPress={handleSignIn}
            isDisabled={loading}
            className="w-full"
          >
            {loading ? "Mengarahkan ke Google…" : "Masuk dengan Google"}
          </Button>
          <p className="text-center text-xs text-ink-muted">
            Hanya email sekolah yang memiliki akses.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
