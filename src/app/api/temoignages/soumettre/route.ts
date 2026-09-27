import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages, getTypes, getEvenements, getInvitations, getCampagnes, patchInvitations, generateId } from "@/lib/db";
import { sendEmail, escapeHtml, getNotificationEmail } from "@/lib/brevo";
import { baseUrlDepuisRequete } from "@/lib/campagnes";
import type { Temoignage, Evenement, TypeTemoignage } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Soumission PUBLIQUE d'un témoignage (formulaire client).
 * Enregistre le témoignage en base comme NON PUBLIÉ (publie: false) pour
 * modération par l'admin, le rattache à son invitation (lien unique marqué
 * « répondu » côté serveur) et notifie contact@insuffle.com (ou CONTACT_EMAIL)
 * par email — sans jamais faire échouer la soumission si l'email échoue.
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

  let marque: "insuffle" | "academie" = body.marque === "academie" ? "academie" : "insuffle";

  // Détermine le type : soit fourni, soit déduit de l'événement.
  let typeId = s(body.type, 100);
  let evenementId = s(body.evenementId, 100);

  // Lien unique (invitation / campagne) : la source de vérité pour
  // l'événement, le type et la marque.
  const invitationId = s(body.invitationId, 64);
  const invitation = invitationId
    ? (await getInvitations()).find((i) => i.id === invitationId)
    : undefined;
  if (invitation) {
    if (invitation.evenementId) evenementId = invitation.evenementId;
    if (invitation.type && !typeId) typeId = invitation.type;
    marque = invitation.marque;
  }

  // Valide l'événement et récupère son type si fourni.
  let evt: Evenement | undefined;
  if (evenementId) {
    const evenements = await getEvenements();
    evt = evenements.find((e) => e.id === evenementId);
    // Un événement clôturé n'accepte plus le lien public, mais un lien
    // personnel (invitation) reste valable.
    const viaInvitation = invitation?.evenementId === evenementId;
    if (!evt || (!evt.actif && !viaInvitation)) {
      evenementId = "";
      evt = undefined;
    } else {
      if (!typeId) typeId = evt.typeId;
    }
  }

  // Valide le type s'il est fourni.
  let typeInfo: TypeTemoignage | undefined;
  if (typeId) {
    const types = await getTypes();
    typeInfo = types.find((t) => t.id === typeId);
    if (!typeInfo) typeId = "";
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
  if (invitation) {
    nouveau.invitationId = invitation.id;
    if (invitation.campagneId) nouveau.campagneId = invitation.campagneId;
  }
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

  // Le lien unique est marqué « répondu » côté serveur : le suivi des
  // campagnes et les relances automatiques ne dépendent pas du navigateur.
  if (invitation && !invitation.used) {
    try {
      await patchInvitations(new Map([[invitation.id, { used: true, usedAt: new Date().toISOString() }]]));
    } catch (e) {
      console.error("[soumettre] marquage de l'invitation impossible :", e);
    }
  }

  // Notification email (attendue, bornée dans le temps, jamais bloquante).
  try {
    const campagneNom = invitation?.campagneId
      ? (await getCampagnes()).find((c) => c.id === invitation.campagneId)?.nom
      : undefined;
    const lienAdmin = `${baseUrlDepuisRequete(request)}/admin`;
    const ligne = (label: string, v?: string) =>
      v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>` : "";
    let champsHtml = "";
    if (champsPersonnalises) {
      const libelles = Object.fromEntries((typeInfo?.champs || []).map((c) => [c.id, c.label]));
      const lignes = Object.entries(champsPersonnalises)
        .filter(([k]) => !k.startsWith("_"))
        .map(([key, val]) => ligne(libelles[key] || key, typeof val === "boolean" ? (val ? "Oui" : "Non") : String(val)))
        .join("");
      if (lignes) champsHtml = `<h3 style="margin:20px 0 8px">Réponses complémentaires</h3><table>${lignes}</table>`;
    }
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:600px">
        <h2 style="margin:0 0 4px">Nouveau témoignage de ${escapeHtml(auteur)}</h2>
        <p style="margin:0 0 16px;font-size:22px;color:#eab308">${"★".repeat(note)}${"☆".repeat(5 - note)} <span style="color:#1e293b;font-size:15px">(${note}/5)</span></p>
        <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid #eab308;background:#f8fafc">${escapeHtml(contenu).replace(/\n/g, "<br/>")}</blockquote>
        <table>
          ${ligne("Entreprise", s(body.entreprise))}
          ${ligne("Poste", s(body.poste))}
          ${ligne("Email", email)}
          ${ligne("Événement", evt?.nom)}
          ${ligne("Intervenant(s)", evt?.animateurs?.join(", "))}
          ${ligne("Campagne", campagneNom)}
          ${ligne("Formulaire", typeInfo?.label)}
          ${ligne("Marque", marque === "academie" ? "Insuffle Académie" : "Insuffle")}
        </table>
        ${champsHtml}
        <p style="margin:24px 0"><a href="${lienAdmin}" style="background:#1f3a8b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Modérer et publier</a></p>
        <p style="color:#64748b;font-size:13px">Ce témoignage est en attente de validation : il n'est pas encore visible publiquement.</p>
      </div>`;
    const r = await Promise.race([
      sendEmail({
        to: getNotificationEmail(),
        subject: `[Témoignage ${note}/5] ${auteur}${evt ? ` — ${evt.nom}` : ""}`,
        html,
        replyTo: email || undefined,
      }),
      new Promise<{ success: false; error: string }>((res) =>
        setTimeout(() => res({ success: false, error: "délai dépassé" }), 8000)),
    ]);
    if (!r.success) console.error(`[soumettre] notification non envoyée à ${getNotificationEmail()} : ${r.error}`);
  } catch (e) {
    console.error("[soumettre] notification impossible :", e);
  }

  return NextResponse.json({
    success: true,
    message: "Merci ! Votre témoignage a bien été enregistré. Il sera publié après validation par notre équipe.",
  });
}
