import { NextRequest, NextResponse } from "next/server";
import { sendEmail, escapeHtml } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Soumission PUBLIQUE d'un témoignage (formulaire client).
 * N'écrit PAS en base : envoie la proposition par email à l'équipe pour
 * modération. Évite tout spam public et toute exposition de clé API.
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

  const destinataire = process.env.CONTACT_EMAIL;
  if (!destinataire) {
    return NextResponse.json(
      { success: false, error: "Service de soumission indisponible" },
      { status: 500 }
    );
  }

  const f = (v: unknown) => (typeof v === "string" ? escapeHtml(v.trim()) : "");
  const typeLabel = f(body.type);
  const evenementId = f(body.evenementId);

  let champsHtml = "";
  if (body.champsPersonnalises && typeof body.champsPersonnalises === "object") {
    const entries = Object.entries(body.champsPersonnalises as Record<string, unknown>);
    if (entries.length > 0) {
      champsHtml = "<h3>Réponses personnalisées</h3>" +
        entries.map(([key, val]) => {
          const safeKey = escapeHtml(key);
          const safeVal = typeof val === "string" ? escapeHtml(val) : typeof val === "number" ? String(val) : String(val);
          return `<p><strong>${safeKey} :</strong> ${safeVal}</p>`;
        }).join("");
    }
  }

  const html = `
    <h2>Nouveau témoignage à modérer</h2>
    <p><strong>Note :</strong> ${"★".repeat(note)}${"☆".repeat(5 - note)} (${note}/5)</p>
    <p><strong>Auteur :</strong> ${escapeHtml(auteur)}</p>
    <p><strong>Poste :</strong> ${f(body.poste)}</p>
    <p><strong>Entreprise :</strong> ${f(body.entreprise)}</p>
    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
    <p><strong>Marque :</strong> ${f(body.marque) || "insuffle"}</p>
    ${typeLabel ? `<p><strong>Type :</strong> ${typeLabel}</p>` : ""}
    ${evenementId ? `<p><strong>Événement :</strong> ${evenementId}</p>` : ""}
    <hr/>
    <p>${escapeHtml(contenu).replace(/\n/g, "<br/>")}</p>
    ${champsHtml}
  `;

  const result = await sendEmail({
    to: destinataire,
    subject: `[Témoignage] Proposition de ${auteur}`,
    html,
    replyTo: email || undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "Envoi impossible, réessayez plus tard" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Merci ! Votre témoignage a bien été transmis.",
  });
}
