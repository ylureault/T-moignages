import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/brevo";
import { passeRelancesAuto } from "@/lib/campagnes";

export const dynamic = "force-dynamic";

/**
 * Lance immédiatement une passe de relance automatique (sans attendre la
 * passe horaire ni la plage 9h–18h) : n'envoie qu'aux non-répondants dont
 * le délai de relance est écoulé, dans les campagnes en relance auto.
 */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { success: false, error: "Envoi d'emails non configuré (BREVO_API_KEY / BREVO_SENDER_EMAIL)" },
      { status: 501 }
    );
  }
  const bilan = await passeRelancesAuto(true);
  const total = bilan.reduce((n, b) => n + b.envoyes, 0);
  return NextResponse.json({
    success: true,
    bilan,
    message: total === 0 ? "Aucune relance due pour l'instant" : `${total} relance(s) envoyée(s)`,
  });
}
