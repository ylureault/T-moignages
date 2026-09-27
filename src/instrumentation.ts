/**
 * Hook de démarrage du serveur Next.js : lance la relance automatique des
 * campagnes (une passe par heure, jours ouvrés 9h–18h heure de Paris).
 * Désactivable avec CAMPAGNES_RELANCE_AUTO=off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { demarrerPlanificateur } = await import("./lib/campagnes");
  demarrerPlanificateur();
}
