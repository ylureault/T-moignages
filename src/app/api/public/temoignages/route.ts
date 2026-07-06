import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, getTypes, getEvenements } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * API PUBLIQUE en lecture seule : retourne tous les témoignages PUBLIÉS
 * dans un format JSON propre et stable, consommable depuis n'importe quel
 * site externe (CORS ouvert). Idéal pour intégrer les avis ailleurs.
 *
 * Filtres optionnels (query params) :
 *   ?marque=insuffle|academie
 *   ?type=<typeId>
 *   ?event=<evenementId>
 *   ?animateur=<nom>   (intervenant : facilitateur / formateur)
 *   ?note=5            (note minimale)
 *   ?limit=20
 *   ?anonyme=1         (anonymise les auteurs : "Marie Dupont" -> "Marie D.")
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const [temoignages, types, evenements] = await Promise.all([
    getTemoignages(),
    getTypes(),
    getEvenements(),
  ]);

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]));
  const evtMap = Object.fromEntries(evenements.map((e) => [e.id, e]));

  let results = temoignages.filter((t) => t.publie !== false && t.archive !== true);

  const marque = searchParams.get("marque");
  if (marque === "insuffle" || marque === "academie") {
    results = results.filter((t) => t.marque === marque);
  }

  const type = searchParams.get("type");
  if (type) results = results.filter((t) => t.type === type);

  const event = searchParams.get("event");
  if (event) results = results.filter((t) => t.evenementId === event);

  const noteMin = parseInt(searchParams.get("note") || "0", 10);
  if (noteMin > 0) results = results.filter((t) => t.note >= noteMin);

  const animateur = searchParams.get("animateur");
  if (animateur) results = results.filter((t) => (t.animateur || "").toLowerCase() === animateur.toLowerCase());

  results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const limit = parseInt(searchParams.get("limit") || "0", 10);
  if (limit > 0) results = results.slice(0, limit);

  const anonyme = searchParams.get("anonyme") === "1";

  const anonymize = (nom: string) => {
    const parts = nom.trim().split(/\s+/);
    const prenom = parts[0] || "";
    const nomFamille = parts[1] || "";
    return nomFamille ? `${prenom} ${nomFamille.charAt(0).toUpperCase()}.` : prenom;
  };

  const data = results.map((t) => {
    const champsPublics = t.champsPersonnalises
      ? Object.fromEntries(Object.entries(t.champsPersonnalises).filter(([k]) => !k.startsWith("_")))
      : undefined;
    return {
      id: t.id,
      auteur: anonyme ? anonymize(t.auteur) : t.auteur,
      poste: t.poste || undefined,
      entreprise: anonyme ? undefined : t.entreprise || undefined,
      note: t.note,
      contenu: t.contenu,
      date: t.date,
      marque: t.marque,
      animateur: t.animateur || undefined,
      verifie: t.verifie,
      recommande: t.recommande,
      avatar: anonyme ? undefined : t.avatar || undefined,
      tags: t.tags && t.tags.length > 0 ? t.tags : undefined,
      type: t.type
        ? { id: t.type, label: typeMap[t.type]?.label || t.type }
        : undefined,
      evenement: t.evenementId && evtMap[t.evenementId]
        ? { id: t.evenementId, nom: evtMap[t.evenementId].nom }
        : undefined,
      reponse: t.reponse || undefined,
      reponses: champsPublics && Object.keys(champsPublics).length > 0 ? champsPublics : undefined,
      url: `/temoignages/${t.id}`,
    };
  });

  const moyenne = data.length > 0
    ? Math.round((data.reduce((s, t) => s + t.note, 0) / data.length) * 10) / 10
    : 0;

  return NextResponse.json(
    {
      success: true,
      meta: {
        count: data.length,
        noteMoyenne: moyenne,
        genereLe: new Date().toISOString(),
      },
      data,
    },
    { headers: CORS },
  );
}
