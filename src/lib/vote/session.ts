import { cookies, headers } from "next/headers";

/**
 * Vote session: token yang sudah diverifikasi, disimpan di cookie httpOnly.
 * Dipakai agar kiosk tidak meminta token ulang di halaman /vote,
 * dan dibersihkan setelah vote berhasil (double-vote protection).
 *
 * Cookie `secure` dideteksi dari header `x-forwarded-proto`, BUKAN dari
 * NODE_ENV: kiosk berjalan di HTTP (localhost / LAN), sedangkan produksi
 * (Vercel/proxy) lewat HTTPS. NODE_ENV=production + HTTP = cookie Secure
 * ditolak browser → NO_VOTE_SESSION.
 */

const VOTE_SESSION_COOKIE = "vote_session";
const VOTE_SESSION_MAX_AGE = 60 * 60; // 1 jam (detik)

export async function setVoteSession(token: string): Promise<void> {
  const store = await cookies();
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const secure = forwardedProto === "https";

  store.set(VOTE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
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
