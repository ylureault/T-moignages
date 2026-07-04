import { NextRequest, NextResponse } from "next/server";
import { getInvitations, saveInvitations } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendEmail, escapeHtml } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/**
 * Envoi (ou marquage d'envoi) de l'email d'invitation à un client.
 *
 * Body :
 *   { sujet, corps }            → envoi via Brevo (si configuré) puis marquage
 *   { marquerSeulement: true }  → marquage seul (l'admin a envoyé via son
 *                                 propre client mail : mailto ou copier/coller)
 *
 * Le premier envoi renseigne `envoyeeAt`, les suivants `relanceAt` : la liste
 * des invitations sait ainsi afficher « envoyée le… » et « à relancer ».
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const invitations = await getInvitations();
  const index = invitations.findIndex((i) => i.id === id);
  if (index === -1) {
    return NextResponse.json({ success: false, error: "Invitation non trouvée" }, { status: 404 });
  }
  const inv = invitations[index];

  const marquerSeulement = body.marquerSeulement === true;

  if (!marquerSeulement) {
    if (!inv.email) {
      return NextResponse.json(
        { success: false, error: "Cette invitation n'a pas d'adresse email — utilisez « Copier » ou « Ouvrir dans mon email »" },
        { status: 400 }
      );
    }
    const sujet = typeof body.sujet === "string" ? body.sujet.trim().slice(0, 300) : "";
    const corps = typeof body.corps === "string" ? body.corps.trim().slice(0, 10000) : "";
    if (!sujet || !corps) {
      return NextResponse.json(
        { success: false, error: "Sujet et corps requis" },
        { status: 400 }
      );
    }

    // Texte brut → HTML sûr (échappé puis retours à la ligne).
    const html = `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;white-space:pre-line">${escapeHtml(corps)}</div>`;
    const result = await sendEmail({ to: inv.email, subject: sujet, html });
    if (!result.success) {
      // 501 : Brevo non configuré → l'UI propose le fallback mailto/copier.
      const notConfigured = (result.error || "").includes("non configuré");
      return NextResponse.json(
        { success: false, error: result.error, brevoIndisponible: notConfigured },
        { status: notConfigured ? 501 : 502 }
      );
    }
  }

  const now = new Date().toISOString();
  if (inv.envoyeeAt) {
    invitations[index] = { ...inv, relanceAt: now };
  } else {
    invitations[index] = { ...inv, envoyeeAt: now };
  }
  await saveInvitations(invitations);

  return NextResponse.json({
    success: true,
    data: invitations[index],
    message: marquerSeulement
      ? "Invitation marquée comme envoyée"
      : `Email envoyé à ${inv.email}`,
  });
}
