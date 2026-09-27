import { NextRequest, NextResponse } from "next/server";
import { getCampagnes, getInvitations } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { baseUrlDepuisRequete } from "@/lib/campagnes";
import { lienInvitation } from "@/lib/modeles";
import type { Invitation } from "@/types";

export const dynamic = "force-dynamic";

function statut(i: Invitation): string {
  if (i.used) return "Répondu";
  if (i.envoiErreur) return "Erreur d'envoi";
  if (i.relanceAt) return "Relancé";
  if (i.ouverteAt) return "Ouvert";
  if (i.envoyeeAt) return "Envoyé";
  return "Non envoyé";
}

const jour = (d?: string) => (d ? d.slice(0, 10) : "");

/**
 * Export CSV (séparateur « ; », UTF-8 avec BOM : s'ouvre directement dans
 * Excel) : un lien personnel par destinataire, pour un publipostage
 * (Gmail, Outlook, Brevo, Mailchimp…) ou un suivi hors de l'outil.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const [campagnes, invitations] = await Promise.all([getCampagnes(), getInvitations()]);
  const campagne = campagnes.find((c) => c.id === id);
  if (!campagne) {
    return NextResponse.json({ success: false, error: "Campagne non trouvée" }, { status: 404 });
  }

  const baseUrl = baseUrlDepuisRequete(request);
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lignes = [
    ["Prénom", "Nom", "Email", "Entreprise", "Lien", "Statut", "Envoyé le", "Relances", "Répondu le"].map(cell).join(";"),
    ...invitations
      .filter((i) => i.campagneId === id)
      .map((i) => {
        const [prenom, ...reste] = (i.nom || "").trim().split(/\s+/);
        return [
          prenom || "", reste.join(" "), i.email, i.entreprise, lienInvitation(baseUrl, i.id),
          statut(i), jour(i.envoyeeAt), String(i.relances || (i.relanceAt ? 1 : 0)), jour(i.usedAt),
        ].map(cell).join(";");
      }),
  ];

  const nomFichier = `campagne-${campagne.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || campagne.id}.csv`;
  return new NextResponse("\uFEFF" + lignes.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
