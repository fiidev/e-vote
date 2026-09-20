# Reverse Proxy, Container Binding & Network Hygiene

This reference guide provides standards for containerized applications running behind cloud reverse proxies (Railway, Cloudflare, Nginx, AWS ALB, Traefik).

---

## 1. The Internal `0.0.0.0` Bind Leak Issue

### Root Cause
Inside Docker containers, processes bind to `0.0.0.0:PORT` so the container interface can accept incoming bridged network packets:
```dockerfile
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080
CMD ["node", "server.js"]
```

When an HTTP request arrives, the web runtime (Node.js `Request.url`, Go `r.Host`, Python `request.host`) internally observes the socket address: `http://0.0.0.0:8080/...`.

If application code generates a redirect using:
```javascript
// ❌ ANTI-PATTERN: Leaks internal socket address to browser
const redirectUrl = new URL("/unauthorized", request.url);
return NextResponse.redirect(redirectUrl);
```
The browser receives `Location: http://0.0.0.0:8080/unauthorized`, causing network failures because `0.0.0.0` is an internal kernel loopback address.

---

## 2. Universal Reverse Proxy Sanitizer Pattern

Always derive the public origin using the standard `X-Forwarded-*` headers, filtering out private socket addresses:

```typescript
export function resolvePublicOrigin(request: Request, fallbackDefault: string): string {
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") || "https";

  // Ignore internal loopback and unspecified addresses
  if (
    forwardedHost &&
    !forwardedHost.startsWith("0.0.0.0") &&
    !forwardedHost.startsWith("127.0.0.1") &&
    !forwardedHost.startsWith("localhost")
  ) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback to configured canonical production URL or localhost
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || fallbackDefault;
}

export function sanitizeRedirectResponse(response: Response, publicOrigin: string): Response {
  const location = response.headers.get("location");
  if (location) {
    // If Location header contains internal socket IP or relative path
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
```

---

## 3. Framework Proxy Trust Configurations

Framework | Configuration Required
:--- | :---
**Express.js** | `app.set('trust proxy', 1);`
**FastAPI / Uvicorn** | `uvicorn app:main --proxy-headers --forwarded-allow-ips='*'`
**Laravel / PHP** | In `TrustProxies.php`: `protected $proxies = '*';`
**Next.js (Edge / Middleware)** | Use `request.nextUrl.clone()` instead of `new URL(..., request.url)`
**Go (Fiber / Gin)** | `app := fiber.New(fiber.Config{ EnableTrustedProxyCheck: true, TrustedProxies: []string{"0.0.0.0/0"} })`
