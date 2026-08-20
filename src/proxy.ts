import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy (Next.js 16 — pengganti middleware.ts).
 * Proteksi rute admin: tanpa cookie session better-auth → redirect ke /login.
 * Validasi penuh dilakukan getAuthUser() di layout admin (cek DB).
 */
export default function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
