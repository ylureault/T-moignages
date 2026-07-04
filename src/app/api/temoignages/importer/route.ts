import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages, generateId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateTemoignage } from "@/lib/validate";
import type { Temoignage } from "@/types";

export const dynamic = "force-dynamic";

const MAX_IMPORT = 5000;

/**
 * Import de témoignages venus d'ailleurs (Google, LinkedIn, ancien outil,
 * export d'un autre système…). Accepte :
 *   - un tableau JSON de témoignages : [ {...}, {...} ]
 *   - ou un objet { temoignages: [...] } (format backup)
 *
 * Règles de fusion — JAMAIS destructif :
 *   - un id absent est généré automatiquement ;
 *   - un id déjà présent en base est IGNORÉ (l'existant n'est jamais écrasé) ;
 *   - un témoignage au même auteur + même contenu qu'un existant est IGNORÉ
 *     (ré-importer le même fichier deux fois ne crée pas de doublons) ;
 *   - rien n'est jamais supprimé.
 *
 * Champs minimum par témoignage : auteur, contenu, note (1-5).
 * Défauts appliqués : source "autre", marque "insuffle", publie false
 * (les imports arrivent non publiés pour relecture, sauf publie: true explicite).
 */
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "JSON invalide" },
      { status: 400 }
    );
  }

  const items: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).temoignages)
      ? ((body as Record<string, unknown>).temoignages as unknown[])
      : [];

  if (items.length === 0) {
    return NextResponse.json(
      { success: false, error: "Aucun témoignage à importer (tableau attendu, ou { temoignages: [...] })" },
      { status: 400 }
    );
  }
  if (items.length > MAX_IMPORT) {
    return NextResponse.json(
      { success: false, error: `Trop de témoignages (max ${MAX_IMPORT} par import)` },
      { status: 400 }
    );
  }

  const existants = await getTemoignages();
  const idsExistants = new Set(existants.map((t) => t.id));
  // Empreinte de contenu : ré-importer le même fichier ne duplique rien.
  const empreinte = (t: { auteur: string; contenu: string }) =>
    `${t.auteur.trim().toLowerCase()}|${t.contenu.trim().toLowerCase()}`;
  const empreintesExistantes = new Set(existants.map(empreinte));

  const ajoutes: Temoignage[] = [];
  const erreurs: { index: number; erreur: string }[] = [];
  let ignores = 0;

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (typeof raw !== "object" || raw === null) {
      erreurs.push({ index: i, erreur: "objet attendu" });
      continue;
    }
    const o = raw as Record<string, unknown>;

    // Normalisation des entrées externes : note en string → number,
    // id absent → généré, publie absent → false (relecture avant publication).
    const candidate: Record<string, unknown> = {
      ...o,
      id: typeof o.id === "string" && o.id ? o.id : generateId(),
      note: typeof o.note === "string" ? parseFloat(o.note) : o.note,
      type: typeof o.type === "string" ? o.type : "",
      source: o.source ?? "autre",
      publie: typeof o.publie === "boolean" ? o.publie : false,
    };

    const r = validateTemoignage(candidate);
    if (!r.ok) {
      erreurs.push({ index: i, erreur: r.error });
      continue;
    }
    if (idsExistants.has(r.value.id) || empreintesExistantes.has(empreinte(r.value))) {
      ignores++;
      continue;
    }
    idsExistants.add(r.value.id);
    empreintesExistantes.add(empreinte(r.value));
    ajoutes.push(r.value);
  }

  if (ajoutes.length > 0) {
    await saveTemoignages([...existants, ...ajoutes]);
  }

  return NextResponse.json({
    success: true,
    importes: ajoutes.length,
    ignores,
    erreurs,
    message: `${ajoutes.length} témoignage(s) importé(s)${ignores > 0 ? `, ${ignores} déjà présent(s) (ignorés)` : ""}${erreurs.length > 0 ? `, ${erreurs.length} en erreur` : ""}`,
  });
}
