import { NextRequest, NextResponse } from "next/server";
import { getCampagnes, saveCampagnes } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/brevo";
import { baseUrlDepuisRequete, envoyerCampagne, marquerEnvoyes, type ModeEnvoi } from "@/lib/campagnes";

export const dynamic = "force-dynamic";

/**
 * Envoi groupé d'une campagne.
 * Body : { mode: "invitation" | "relance", sujet?, corps?, ids?, marquerSeulement? }
 *   - invitation : destinataires jamais contactés ;
 *   - relance    : contactés sans réponse (jamais ceux qui ont répondu) ;
 *   - sujet/corps : modèle personnalisé (variables résolues par destinataire),
 *     sinon le modèle choisi dans la campagne ;
 *   - marquerSeulement : l'envoi a été fait ailleurs (export CSV + publipostage).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Requête invalide" }, { status: 400 });
  }

  const mode: ModeEnvoi = body.mode === "relance" ? "relance" : "invitation";
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : undefined;

  const campagnes = await getCampagnes();
  const index = campagnes.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ success: false, error: "Campagne non trouvée" }, { status: 404 });
  }
  const campagne = campagnes[index];

  if (body.marquerSeulement === true) {
    const n = await marquerEnvoyes(campagne, mode, ids);
    return NextResponse.json({ success: true, marques: n, message: `${n} destinataire(s) marqué(s) comme contacté(s)` });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      success: false,
      brevoIndisponible: true,
      error: "Envoi d'emails non configuré (BREVO_API_KEY / BREVO_SENDER_EMAIL). Exportez le CSV pour un publipostage, puis marquez les destinataires comme contactés.",
    }, { status: 501 });
  }

  // Mémorise l'URL publique pour les relances automatiques (sans requête).
  const baseUrl = baseUrlDepuisRequete(request);
  if (campagne.lienBase !== baseUrl) {
    campagnes[index] = { ...campagne, lienBase: baseUrl };
    await saveCampagnes(campagnes);
  }

  try {
    const r = await envoyerCampagne(campagnes[index], mode, {
      baseUrl,
      ids,
      sujet: typeof body.sujet === "string" ? body.sujet.slice(0, 300) : undefined,
      corps: typeof body.corps === "string" ? body.corps.slice(0, 10000) : undefined,
    });
    return NextResponse.json({
      success: true,
      ...r,
      message: r.cibles === 0
        ? "Personne à contacter"
        : `${r.envoyes} email(s) envoyé(s)${r.echecs.length ? `, ${r.echecs.length} échec(s)` : ""}`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Envoi impossible" },
      { status: 400 }
    );
  }
}
