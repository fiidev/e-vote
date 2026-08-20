import { cookies } from "next/headers";

/**
 * Vote session: token yang sudah diverifikasi, disimpan di cookie httpOnly.
 * Dipakai agar kiosk tidak meminta token ulang di halaman /vote,
 * dan dibersihkan setelah vote berhasil (double-vote protection).
 */

const VOTE_SESSION_COOKIE = "vote_session";
const VOTE_SESSION_MAX_AGE = 60 * 60; // 1 jam (detik)

export async function setVoteSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(VOTE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VOTE_SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getVoteSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTE_SESSION_COOKIE)?.value ?? null;
}

export async function clearVoteSession(): Promise<void> {
  const store = await cookies();
  store.delete(VOTE_SESSION_COOKIE);
}
