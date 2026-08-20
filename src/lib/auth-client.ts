import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, useSession, signOut } = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

/** Sign-in Google untuk admin (dipakai halaman login). */
export async function signInWithGoogle(callbackURL = "/admin/dashboard") {
  await signIn.social({
    provider: "google",
    callbackURL,
  });
}
