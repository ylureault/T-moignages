import { NextRequest, NextResponse } from "next/server";

// Rate limiting en mémoire (fenêtre glissante simple).
// Pour une prod multi-instances, remplacer par Redis/Upstash.
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // par IP par fenêtre
const buckets = new Map<string, { count: number; reset: number }>();

// X-Real-IP est posé par le reverse proxy (nginx : $remote_addr), le client
// ne peut pas le falsifier. À défaut, on prend la DERNIÈRE entrée de
// X-Forwarded-For (ajoutée par le proxy) : la première est fournie par le
// client et permettrait de contourner la limite en changeant de valeur.
function getClientIp(request: NextRequest): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",").pop()!.trim();
  return "unknown";
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
      // https: pour les bannières/avatars hébergés ailleurs (URL externe).
      "img-src 'self' data: blob: https:",
      // Polices de marque (Poppins, Outfit) servies par Google Fonts.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Google Analytics (gtag.js) : script + envoi des mesures.
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
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
