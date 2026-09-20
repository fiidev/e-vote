import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

function getRedirectUrl(request: Request, path: string): URL {
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") || "https";

  if (
    forwardedHost &&
    !forwardedHost.startsWith("0.0.0.0") &&
    !forwardedHost.startsWith("127.0.0.1")
  ) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (baseUrl) {
    return new URL(path, baseUrl);
  }

  return new URL(path, request.url);
}

export async function GET(request: Request) {
  try {
    const response = await handlers.GET(request);
    if (response.status >= 400) {
      const url = new URL(request.url);
      if (url.pathname.includes("/callback")) {
        const redirectUrl = getRedirectUrl(request, "/unauthorized");
        redirectUrl.searchParams.set("error", "FORBIDDEN");
        return NextResponse.redirect(redirectUrl);
      }
    }
    return response;
  } catch (_error) {
    const url = new URL(request.url);
    if (url.pathname.includes("/callback")) {
      const redirectUrl = getRedirectUrl(request, "/unauthorized");
      redirectUrl.searchParams.set("error", "FORBIDDEN");
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan autentikasi." },
      { status: 500 },
    );
  }
}

export const POST = handlers.POST;
