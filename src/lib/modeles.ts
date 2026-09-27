import type { Invitation, Evenement } from "@/types";

/**
 * Fonctions pures (utilisables côté client ET serveur) pour les modèles
 * d'email : l'aperçu dans l'admin et l'envoi groupé serveur produisent
 * exactement le même texte.
 */

/** URL du formulaire personnel d'un destinataire. */
export function lienInvitation(baseUrl: string, invitationId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/temoignages/nouveau?token=${invitationId}`;
}

/**
 * Résout les variables d'un modèle : {prenom} {nom} {entreprise}
 * {evenement} {intervenant} {lien} {signature}.
 */
export function resoudreVariables(
  texte: string,
  inv: Pick<Invitation, "id" | "nom" | "entreprise" | "marque">,
  evt: Pick<Evenement, "nom" | "animateurs"> | null | undefined,
  baseUrl: string
): string {
  const prenom = (inv.nom || "").trim().split(/\s+/)[0] || "";
  const signature = inv.marque === "academie"
    ? "Yoan Lureault — Insuffle Académie"
    : "Yoan Lureault — Insuffle";
  const intervenant = evt?.animateurs && evt.animateurs.length > 0 ? evt.animateurs.join(", ") : "";
  return texte
    .split("{prenom}").join(prenom)
    .split("{nom}").join(inv.nom || "")
    .split("{entreprise}").join(inv.entreprise || "votre entreprise")
    .split("{evenement}").join(evt?.nom || "notre collaboration")
    .split("{intervenant}").join(intervenant)
    .split("{lien}").join(lienInvitation(baseUrl, inv.id))
    .split("{signature}").join(signature);
}
