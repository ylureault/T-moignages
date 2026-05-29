import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, clearSession, isAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Mot de passe requis" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ success: false, error: "Mot de passe incorrect" }, { status: 401 });
    }

    const { cookie } = createSession();
    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", clearSession());
  return res;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ success: true, authenticated: isAdmin(request) });
}
