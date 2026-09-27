import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCampagnes, saveCampagnes, getInvitations, saveInvitations, getEvenements, getTypes, generateId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateCampagne } from "@/lib/validate";
import { analyserDestinataires } from "@/lib/destinataires";
import { statsCampagne, baseUrlDepuisRequete } from "@/lib/campagnes";
import type { Campagne, Invitation } from "@/types";

export const dynamic = "force-dynamic";

/** Liste des campagnes avec leurs statistiques (?archives=1 pour les archivées). */
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const archives = request.nextUrl.searchParams.get("archives") === "1";
  const [campagnes, invitations, evenements] = await Promise.all([getCampagnes(), getInvitations(), getEvenements()]);
  const data = campagnes
    .filter((c) => (archives ? c.archive : !c.archive))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({
      ...c,
      evenementNom: evenements.find((e) => e.id === c.evenementId)?.nom,
      stats: statsCampagne(invitations.filter((i) => i.campagneId === c.id)),
    }));
  return NextResponse.json({ success: true, data });
}

/**
 * Crée une campagne et ses invitations (un lien unique par destinataire).
 * Body : { nom, evenementId?, type?, marque?, entreprise?, message?,
 *          modeleInvitationId?, modeleRelanceId?, relanceAuto?,
 *          relanceDelaiJours?, relancesMax?, destinataires: "texte collé" }
 */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Requête invalide" }, { status: 400 });
  }

  // Hérite du type, de la marque et du client de l'événement choisi.
  const evenements = await getEvenements();
  const evt = typeof body.evenementId === "string"
    ? evenements.find((e) => e.id === body.evenementId)
    : undefined;

  const candidat = validateCampagne({
    ...body,
    id: generateId(),
    evenementId: evt?.id,
    type: (typeof body.type === "string" && body.type) || evt?.typeId || "",
    marque: evt?.marque || body.marque,
    entreprise: (typeof body.entreprise === "string" && body.entreprise.trim()) || evt?.entreprise,
    lienBase: baseUrlDepuisRequete(request),
    createdAt: new Date().toISOString(),
    archive: false,
  });
  if (!candidat.ok) {
    return NextResponse.json({ success: false, error: candidat.error }, { status: 400 });
  }
  const campagne: Campagne = candidat.value;

  if (campagne.type) {
    const types = await getTypes();
    if (!types.some((t) => t.id === campagne.type)) campagne.type = "";
  }

  const analyse = analyserDestinataires(typeof body.destinataires === "string" ? body.destinataires : "");
  const nouvelles: Invitation[] = analyse.valides.map((d) => ({
    id: randomBytes(16).toString("hex"),
    nom: d.nom,
    email: d.email,
    entreprise: d.entreprise || campagne.entreprise || "",
    type: campagne.type,
    ...(campagne.evenementId ? { evenementId: campagne.evenementId } : {}),
    marque: campagne.marque,
    message: campagne.message || "",
    createdAt: new Date().toISOString(),
    used: false,
    campagneId: campagne.id,
  }));

  const campagnes = await getCampagnes();
  campagnes.push(campagne);
  await saveCampagnes(campagnes);
  if (nouvelles.length > 0) {
    const invitations = await getInvitations();
    await saveInvitations([...invitations, ...nouvelles]);
  }

  return NextResponse.json({
    success: true,
    data: { ...campagne, stats: statsCampagne(nouvelles) },
    ajoutes: nouvelles.length,
    ignorees: analyse.ignorees,
    doublons: analyse.doublons,
  }, { status: 201 });
}
