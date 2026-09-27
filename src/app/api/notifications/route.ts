import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getNotificationEmail, isEmailConfigured, sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

/** État des notifications : destinataire et disponibilité de l'envoi. */
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  return NextResponse.json({
    success: true,
    data: { destinataire: getNotificationEmail(), emailConfigure: isEmailConfigured() },
  });
}

/** Envoie un email de test au destinataire des notifications. */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const destinataire = getNotificationEmail();
  const r = await sendEmail({
    to: destinataire,
    subject: "[Témoignages] Test de notification",
    html: `<p>Les notifications fonctionnent : vous recevrez un email à cette adresse (${destinataire}) à chaque nouveau témoignage donné.</p>`,
  });
  if (!r.success) {
    const nonConfigure = (r.error || "").includes("non configur");
    return NextResponse.json({ success: false, error: r.error }, { status: nonConfigure ? 501 : 502 });
  }
  return NextResponse.json({ success: true, message: `Email de test envoyé à ${destinataire}` });
}
