import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyToGo(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const goBackendUrl =
    process.env.GO_BACKEND_URL || "http://backend-go.railway.internal:8080";
  const search = request.nextUrl.search;
  const targetUrl = `${goBackendUrl}/api/v1/${path.join("/")}${search}`;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", request.headers.get("host") || "");
  headers.delete("host");

  try {
    const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
    const body = isBodyAllowed ? await request.arrayBuffer() : undefined;

    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const resHeaders = new Headers(res.headers);
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (_error) {
    return NextResponse.json(
      {
        error: "GATEWAY_TIMEOUT",
        message: "Microservice backend Go belum siap atau tidak merespon.",
      },
      { status: 504 },
    );
  }
}

export const GET = proxyToGo;
export const POST = proxyToGo;
export const OPTIONS = proxyToGo;
