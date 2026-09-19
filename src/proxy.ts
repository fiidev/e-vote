import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy (Next.js 16).
 * 1. Proteksi rute admin: tanpa cookie session better-auth → redirect ke /login.
 * 2. Edge routing voting kiosk:
 *    - Hanya mencegat request GET agar tidak mengganggu Server Actions (POST).
 *    - Akses GET /verify dengan session aktif → redirect ke /vote.
 *    - Akses GET /vote tanpa session → redirect ke /verify.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Proteksi rute admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionCookie =
      request.cookies.get("__Secure-better-auth.session_token") ??
      request.cookies.get("better-auth.session_token");

    if (!sessionCookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Kiosk voting guard (hanya untuk navigasi halaman GET, biarkan POST Server Action lewat)
  if (request.method === "GET") {
    if (pathname === "/verify") {
      const voteSession = request.cookies.get("vote_session")?.value;
      if (voteSession) {
        return NextResponse.redirect(new URL("/vote", request.url));
      }
    }

    if (pathname === "/vote") {
      const voteSession = request.cookies.get("vote_session")?.value;
      if (!voteSession) {
        return NextResponse.redirect(new URL("/verify", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/verify", "/vote"],
};
