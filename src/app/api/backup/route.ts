import { NextRequest, NextResponse } from "next/server";
import { getFullBackup, restoreBackup, mergeBackup } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateBackup } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const backup = await getFullBackup();

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-temoignages-${backup.exportDate.split("T")[0]}.json"`,
    },
  });
}

/**
 * Restauration d'un backup. Deux modes :
 *  - "fusion" (DÉFAUT) : ajoute uniquement les entrées inconnues, ne touche
 *    jamais aux données existantes. Ré-importer un backup est donc toujours
 *    sans risque.
 *  - "remplacer" : remplace intégralement les 4 collections. À demander
 *    explicitement (?mode=remplacer) — un snapshot est de toute façon pris
 *    à chaque écriture, donc l'état précédent reste récupérable.
 */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const mode = request.nextUrl.searchParams.get("mode") === "remplacer" ? "remplacer" : "fusion";

  // Validation stricte du schéma AVANT toute écriture.
  const result = validateBackup(body);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: `Backup invalide : ${result.error}` },
      { status: 400 }
    );
  }

  if (mode === "fusion") {
    const added = await mergeBackup(result.value);
    const total = added.temoignages + added.types + added.evenements + added.invitations;
    return NextResponse.json({
      success: true,
      mode,
      added,
      message: total === 0
        ? "Fusion : rien à ajouter, toutes les données du backup sont déjà présentes"
        : `Fusion : ${added.temoignages} témoignage(s), ${added.types} type(s), ${added.evenements} événement(s), ${added.invitations} invitation(s) ajoutés — aucune donnée existante modifiée`,
    });
  }

  await restoreBackup(result.value);

  return NextResponse.json({
    success: true,
    mode,
    message: `Remplacement effectué : ${result.value.temoignages.length} témoignages, ${result.value.types.length} types, ${result.value.evenements.length} événements, ${result.value.invitations.length} invitations`,
  });
}
