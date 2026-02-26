import { NextRequest, NextResponse } from "next/server";
import temoignagesData from "@/data/temoignages.json";
import type { Temoignage } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  let results: Temoignage[] = temoignagesData as Temoignage[];

  // Filtre par type
  const type = searchParams.get("type");
  if (type) {
    results = results.filter((t) => t.type === type);
  }

  // Filtre par source (google, trustpilot, linkedin...)
  const source = searchParams.get("source");
  if (source) {
    results = results.filter((t) => t.source === source);
  }

  // Filtre par note minimum
  const noteMin = searchParams.get("note_min");
  if (noteMin) {
    const min = parseInt(noteMin, 10);
    if (!isNaN(min)) {
      results = results.filter((t) => t.note >= min);
    }
  }

  // Filtre par tag
  const tag = searchParams.get("tag");
  if (tag) {
    results = results.filter((t) =>
      t.tags.some((tg) => tg.toLowerCase() === tag.toLowerCase())
    );
  }

  // Filtre par vérifié uniquement
  const verifie = searchParams.get("verifie");
  if (verifie === "true") {
    results = results.filter((t) => t.verifie);
  }

  // Recherche texte dans contenu ou auteur
  const q = searchParams.get("q");
  if (q) {
    const search = q.toLowerCase();
    results = results.filter(
      (t) =>
        t.contenu.toLowerCase().includes(search) ||
        t.auteur.toLowerCase().includes(search) ||
        t.entreprise.toLowerCase().includes(search)
    );
  }

  // Tri
  const sort = searchParams.get("sort") || "date";
  const order = searchParams.get("order") || "desc";
  results.sort((a, b) => {
    let cmp = 0;
    if (sort === "date") {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sort === "note") {
      cmp = a.note - b.note;
    }
    return order === "desc" ? -cmp : cmp;
  });

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
  );
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginated = results.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
