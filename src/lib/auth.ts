import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

const SECURE = process.env.NODE_ENV === "production" ? " Secure;" : "";

/**
 * Sessions SANS état serveur : le cookie contient un jeton signé (HMAC).
 * Avantages : survit aux redémarrages/redéploiements et fonctionne en
 * serverless (aucun stockage mémoire partagé requis). Le secret de signature
 * est SESSION_SECRET, ou à défaut ADMIN_PASSWORD (stable entre redémarrages ;
 * changer le mot de passe invalide automatiquement les sessions existantes).
 */
function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function makeToken(): string {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

function verifyToken(token: string): boolean {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  const exp = parseInt(payload, 10);
  return Number.isFinite(exp) && exp > Date.now();
}

export function createSession(): { token: string; cookie: string } {
  const token = makeToken();
  const cookie = `${SESSION_COOKIE}=${token}; HttpOnly;${SECURE} SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
  return { token, cookie };
}

export function clearSession(): string {
  return `${SESSION_COOKIE}=; HttpOnly;${SECURE} SameSite=Lax; Path=/; Max-Age=0`;
}

function isValidSession(request: NextRequest): boolean {
  const cookieVal = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookieVal) return false;
  return verifyToken(cookieVal);
}

export function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored || stored.length < 4) return false;
  const a = Buffer.from(password, "utf-8");
  const b = Buffer.from(stored, "utf-8");
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function requireAuth(request: NextRequest): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 4) {
    return NextResponse.json(
      { success: false, error: "Mot de passe admin non configuré (ADMIN_PASSWORD dans .env)" },
      { status: 500 },
    );
  }

  if (isValidSession(request)) return null;

  return NextResponse.json(
    { success: false, error: "Non authentifié" },
    { status: 401 },
  );
}

export function isAdmin(request: NextRequest): boolean {
  return isValidSession(request);
}
