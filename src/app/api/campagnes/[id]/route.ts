import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCampagnes, saveCampagnes, getInvitations, saveInvitations, getEvenements } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateCampagne } from "@/lib/validate";
import { analyserDestinataires } from "@/lib/destinataires";
import { statsCampagne } from "@/lib/campagnes";
import type { Invitation } from "@/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Détail d'une campagne : réglages, destinataires, statistiques. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const [campagnes, invitations, evenements] = await Promise.all([getCampagnes(), getInvitations(), getEvenements()]);
  const campagne = campagnes.find((c) => c.id === id);
  if (!campagne) {
    return NextResponse.json({ success: false, error: "Campagne non trouvée" }, { status: 404 });
  }
  const invs = invitations.filter((i) => i.campagneId === id);
  return NextResponse.json({
    success: true,
    data: {
      ...campagne,
      evenement: evenements.find((e) => e.id === campagne.evenementId) || null,
      stats: statsCampagne(invs),
      invitations: invs,
    },
  });
}

/**
 * Met à jour les réglages (nom, message, modèles, relance auto, archive)
 * et/ou ajoute des destinataires (`destinataires` : texte collé).
 * Rien n'est jamais supprimé.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Requête invalide" }, { status: 400 });
  }

  const campagnes = await getCampagnes();
  const index = campagnes.findIndex((c) => c.id === id);
  if (index === -1) {
    return NextResponse.json({ success: false, error: "Campagne non trouvée" }, { status: 404 });
  }
  const actuelle = campagnes[index];

  // Seuls les réglages modifiables sont pris en compte (l'événement, le type
  // et la marque restent ceux des liens déjà envoyés).
  const modifiables = ["nom", "message", "modeleInvitationId", "modeleRelanceId", "relanceAuto", "relanceDelaiJours", "relancesMax", "archive"];
  const patch: Record<string, unknown> = {};
  for (const k of modifiables) if (body[k] !== undefined) patch[k] = body[k];
  const r = validateCampagne({ ...actuelle, ...patch });
  if (!r.ok) {
    return NextResponse.json({ success: false, error: r.error }, { status: 400 });
  }
  if (patch.archive === false) delete r.value.archive;
  campagnes[index] = r.value;
  await saveCampagnes(campagnes);

  let ajoutes = 0;
  let ignorees: string[] = [];
  let doublons = 0;
  if (typeof body.destinataires === "string" && body.destinataires.trim()) {
    const invitations = await getInvitations();
    const existants = invitations.filter((i) => i.campagneId === id).map((i) => i.email);
    const analyse = analyserDestinataires(body.destinataires, existants);
    ignorees = analyse.ignorees;
    doublons = analyse.doublons;
    const c = r.value;
    const nouvelles: Invitation[] = analyse.valides.map((d) => ({
      id: randomBytes(16).toString("hex"),
      nom: d.nom,
      email: d.email,
      entreprise: d.entreprise || c.entreprise || "",
      type: c.type,
      ...(c.evenementId ? { evenementId: c.evenementId } : {}),
      marque: c.marque,
      message: c.message || "",
      createdAt: new Date().toISOString(),
      used: false,
      campagneId: c.id,
    }));
    ajoutes = nouvelles.length;
    if (ajoutes > 0) await saveInvitations([...invitations, ...nouvelles]);
  }

  return NextResponse.json({ success: true, data: r.value, ajoutes, ignorees, doublons });
}
