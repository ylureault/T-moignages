import { NextRequest, NextResponse } from "next/server";

// Rate limiting en mémoire (fenêtre glissante simple).
// Pour une prod multi-instances, remplacer par Redis/Upstash.
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // par IP par fenêtre
const buckets = new Map<string, { count: number; reset: number }>();

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.reset) {
    buckets.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

// Nettoyage périodique des buckets expirés.
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets) {
    if (now > b.reset) buckets.delete(ip);
  }
}, WINDOW_MS).unref?.();

function securityHeaders(response: NextResponse): NextResponse {
  const h = response.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("X-XSS-Protection", "1; mode=block");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  h.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ")
  );
  return response;
}

export function middleware(request: NextRequest) {
  // Rate limiting sur les routes API uniquement.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Garde-fou taille de payload (sauf upload, géré par sa propre limite).
    const isUpload = request.nextUrl.pathname.startsWith("/api/upload");
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const maxBody = isUpload ? 6 * 1024 * 1024 : 1 * 1024 * 1024;
    if (contentLength > maxBody) {
      return securityHeaders(
        NextResponse.json(
          { success: false, error: "Payload trop volumineux" },
          { status: 413 }
        )
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      const res = NextResponse.json(
        { success: false, error: "Trop de requêtes. Réessayez plus tard." },
        { status: 429 }
      );
      res.headers.set("Retry-After", "60");
      return securityHeaders(res);
    }
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
