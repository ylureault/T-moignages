import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, randomBytes, createHash } from "crypto";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const sessions = new Map<string, number>();

export function createSession(): { token: string; cookie: string } {
  const token = randomBytes(32).toString("hex");
  const hashed = hashToken(token);
  sessions.set(hashed, Date.now() + SESSION_MAX_AGE * 1000);

  for (const [k, exp] of sessions) {
    if (exp < Date.now()) sessions.delete(k);
  }

  const cookie = `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
  return { token, cookie };
}

export function clearSession(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function isValidSession(request: NextRequest): boolean {
  const cookieVal = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookieVal) return false;
  const hashed = hashToken(cookieVal);
  const exp = sessions.get(hashed);
  if (!exp || exp < Date.now()) {
    sessions.delete(hashed);
    return false;
  }
  return true;
}

export function verifyPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored || stored.length < 4) return false;
  return safeCompare(password, stored);
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
