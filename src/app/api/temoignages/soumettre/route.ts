import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages, getTypes, getEvenements, generateId } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/brevo";
import type { Temoignage } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Soumission PUBLIQUE d'un témoignage (formulaire client).
 * Enregistre le témoignage en base comme NON PUBLIÉ (publie: false) pour
 * modération par l'admin. Envoie aussi une notification email si configuré
 * (mais n'échoue pas si l'email n'est pas disponible).
 * Protégé par le rate limiting global du middleware.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Requête invalide" },
      { status: 400 }
    );
  }

  const auteur = typeof body.auteur === "string" ? body.auteur.trim() : "";
  const contenu = typeof body.contenu === "string" ? body.contenu.trim() : "";
  const note = typeof body.note === "number" ? body.note : 0;

  if (!auteur || auteur.length > 200) {
    return NextResponse.json(
      { success: false, error: "Nom requis (max 200 caractères)" },
      { status: 400 }
    );
  }
  if (!contenu || contenu.length < 10 || contenu.length > 5000) {
    return NextResponse.json(
      { success: false, error: "Témoignage requis (10 à 5000 caractères)" },
      { status: 400 }
    );
  }
  if (note < 1 || note > 5) {
    return NextResponse.json(
      { success: false, error: "Note requise (1 à 5)" },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && (!emailRegex.test(email) || email.length > 254)) {
    return NextResponse.json(
      { success: false, error: "Email invalide" },
      { status: 400 }
    );
  }

  const s = (v: unknown, max = 200) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const marque = body.marque === "academie" ? "academie" : "insuffle";

  // Détermine le type : soit fourni, soit déduit de l'événement.
  let typeId = s(body.type, 100);
  let evenementId = s(body.evenementId, 100);

  // Valide l'événement et récupère son type/marque si fourni.
  if (evenementId) {
    const evenements = await getEvenements();
    const evt = evenements.find((e) => e.id === evenementId);
    if (!evt || !evt.actif) {
      // Événement inexistant ou clôturé : on ignore le lien mais on accepte le témoignage.
      evenementId = "";
    } else {
      if (!typeId) typeId = evt.typeId;
    }
  }

  // Valide le type s'il est fourni.
  if (typeId) {
    const types = await getTypes();
    if (!types.some((t) => t.id === typeId)) {
      typeId = "";
    }
  }

  // Nettoie les champs personnalisés.
  let champsPersonnalises: Record<string, unknown> | undefined;
  if (body.champsPersonnalises && typeof body.champsPersonnalises === "object" && !Array.isArray(body.champsPersonnalises)) {
    const entries = Object.entries(body.champsPersonnalises as Record<string, unknown>);
    if (entries.length > 0) {
      champsPersonnalises = {};
      for (const [key, val] of entries.slice(0, 50)) {
        const safeKey = key.slice(0, 100);
        if (typeof val === "string") champsPersonnalises[safeKey] = val.slice(0, 5000);
        else if (typeof val === "number" || typeof val === "boolean") champsPersonnalises[safeKey] = val;
        else if (val != null) champsPersonnalises[safeKey] = String(val).slice(0, 5000);
      }
    }
  }

  // Construit le témoignage en attente de modération.
  const nouveau: Temoignage = {
    id: generateId(),
    auteur,
    entreprise: s(body.entreprise),
    poste: s(body.poste),
    avatar: "",
    note,
    contenu,
    reponse: null,
    type: typeId,
    tags: [],
    source: "site",
    verifie: false,
    date: new Date().toISOString().split("T")[0],
    recommande: note >= 4,
    marque,
    publie: false, // En attente de modération : invisible côté public.
  };
  if (evenementId) nouveau.evenementId = evenementId;
  if (champsPersonnalises) nouveau.champsPersonnalises = champsPersonnalises;
  if (email) {
    // On stocke l'email dans les champs personnalisés pour que l'admin puisse recontacter.
    nouveau.champsPersonnalises = { ...(nouveau.champsPersonnalises || {}), _email: email };
  }

  // Enregistre en base (source de vérité, ne dépend d'aucun service externe).
  try {
    const existants = await getTemoignages();
    existants.push(nouveau);
    await saveTemoignages(existants);
  } catch {
    return NextResponse.json(
      { success: false, error: "Impossible d'enregistrer le témoignage, réessayez." },
      { status: 500 }
    );
  }

  // Notification email best-effort (n'impacte jamais le succès).
  const destinataire = process.env.CONTACT_EMAIL;
  if (destinataire) {
    const f = (v: unknown) => (typeof v === "string" ? escapeHtml(v.trim()) : "");
    let champsHtml = "";
    if (champsPersonnalises) {
      champsHtml = "<h3>Réponses personnalisées</h3>" +
        Object.entries(champsPersonnalises)
          .filter(([k]) => k !== "_email")
          .map(([key, val]) => `<p><strong>${escapeHtml(key)} :</strong> ${escapeHtml(String(val))}</p>`)
          .join("");
    }
    const html = `
      <h2>Nouveau témoignage à modérer</h2>
      <p>Connectez-vous à l'administration pour le valider et le publier.</p>
      <p><strong>Note :</strong> ${"★".repeat(note)}${"☆".repeat(5 - note)} (${note}/5)</p>
      <p><strong>Auteur :</strong> ${escapeHtml(auteur)}</p>
      <p><strong>Poste :</strong> ${f(body.poste)}</p>
      <p><strong>Entreprise :</strong> ${f(body.entreprise)}</p>
      <p><strong>Email :</strong> ${escapeHtml(email)}</p>
      <p><strong>Marque :</strong> ${marque}</p>
      ${typeId ? `<p><strong>Type :</strong> ${escapeHtml(typeId)}</p>` : ""}
      ${evenementId ? `<p><strong>Événement :</strong> ${escapeHtml(evenementId)}</p>` : ""}
      <hr/>
      <p>${escapeHtml(contenu).replace(/\n/g, "<br/>")}</p>
      ${champsHtml}
    `;
    sendEmail({
      to: destinataire,
      subject: `[Témoignage] Proposition de ${auteur}`,
      html,
      replyTo: email || undefined,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    message: "Merci ! Votre témoignage a bien été enregistré. Il sera publié après validation par notre équipe.",
  });
}
