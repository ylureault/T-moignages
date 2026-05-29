import { NextRequest, NextResponse } from "next/server";

export function requireApiKey(request: NextRequest): NextResponse | null {
  const header = request.headers.get("x-api-key");

  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Clé API non configurée sur le serveur" },
      { status: 500 }
    );
  }

  if (!header || header !== apiKey) {
    return NextResponse.json(
      { success: false, error: "Clé API invalide ou manquante (header x-api-key)" },
      { status: 401 }
    );
  }

  return null;
}
