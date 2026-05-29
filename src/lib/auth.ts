import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const MIN_KEY_LENGTH = 32;

/**
 * Comparaison à temps constant pour éviter les timing attacks.
 * Renvoie false si les longueurs diffèrent (sans court-circuit révélateur).
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // On compare quand même contre soi-même pour garder un temps constant.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function requireApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.API_SECRET_KEY;

  // Refus de démarrer une route protégée si la clé serveur est absente ou faible.
  if (!apiKey || apiKey.length < MIN_KEY_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Clé API serveur non configurée ou trop faible (min 32 caractères)",
      },
      { status: 500 }
    );
  }

  const header = request.headers.get("x-api-key");
  if (!header || !safeCompare(header, apiKey)) {
    return NextResponse.json(
      {
        success: false,
        error: "Clé API invalide ou manquante (header x-api-key)",
      },
      { status: 401 }
    );
  }

  return null;
}
