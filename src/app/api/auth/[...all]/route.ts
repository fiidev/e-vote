import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

function sanitizeRequest(request: Request): {
  req: Request;
  publicOrigin: string;
} {
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") || "https";

  const publicOrigin =
    forwardedHost &&
    !forwardedHost.startsWith("0.0.0.0") &&
    !forwardedHost.startsWith("127.0.0.1")
      ? `${forwardedProto}://${forwardedHost}`
      : process.env.NEXT_PUBLIC_APP_URL ||
        process.env.BETTER_AUTH_URL ||
        "https://e-vote.fiidev.my.id";

  const url = new URL(request.url);
  const rewrittenUrl = new URL(url.pathname + url.search, publicOrigin);

  const req =
    rewrittenUrl.toString() === request.url
      ? request
      : new Request(rewrittenUrl.toString(), request);

  return { req, publicOrigin };
}

function sanitizeResponse(response: Response, publicOrigin: string): Response {
  const location = response.headers.get("location");
  if (location) {
    if (
      location.includes("0.0.0.0") ||
      location.includes("127.0.0.1") ||
      location.startsWith("/")
    ) {
      const fixedUrl = new URL(location, publicOrigin);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("location", fixedUrl.toString());
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }
  return response;
}

export async function GET(request: Request) {
  const { req, publicOrigin } = sanitizeRequest(request);
  try {
    const response = await handlers.GET(req);
    return sanitizeResponse(response, publicOrigin);
  } catch (_error) {
    const url = new URL(request.url);
    if (url.pathname.includes("/callback")) {
      const redirectUrl = new URL(
        "/unauthorized?error=FORBIDDEN",
        publicOrigin,
      );
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan autentikasi." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { req, publicOrigin } = sanitizeRequest(request);
  const response = await handlers.POST(req);
  return sanitizeResponse(response, publicOrigin);
}
