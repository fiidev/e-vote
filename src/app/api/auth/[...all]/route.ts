import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  try {
    const response = await handlers.GET(request);
    if (response.status >= 400) {
      const url = new URL(request.url);
      if (url.pathname.includes("/callback")) {
        const redirectUrl = new URL("/unauthorized", request.url);
        redirectUrl.searchParams.set("error", "FORBIDDEN");
        return NextResponse.redirect(redirectUrl);
      }
    }
    return response;
  } catch (_error) {
    const url = new URL(request.url);
    if (url.pathname.includes("/callback")) {
      const redirectUrl = new URL("/unauthorized", request.url);
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
