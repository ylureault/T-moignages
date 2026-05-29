import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages, generateId } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";
import { validateTemoignage } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  let results = await getTemoignages();

  const type = searchParams.get("type");
  if (type) {
    results = results.filter((t) => t.type === type);
  }

  const source = searchParams.get("source");
  if (source) {
    results = results.filter((t) => t.source === source);
  }

  const marque = searchParams.get("marque");
  if (marque) {
    results = results.filter((t) => t.marque === marque);
  }

  const noteMin = searchParams.get("note_min");
  if (noteMin) {
    const min = parseInt(noteMin, 10);
    if (!isNaN(min)) {
      results = results.filter((t) => t.note >= min);
    }
  }

  const tag = searchParams.get("tag");
  if (tag) {
    results = results.filter((t) =>
      t.tags.some((tg) => tg.toLowerCase() === tag.toLowerCase())
    );
  }

  const verifie = searchParams.get("verifie");
  if (verifie === "true") {
    results = results.filter((t) => t.verifie);
  }

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

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();

  const required = ["auteur", "contenu", "type", "note"];
  for (const field of required) {
    if (!(field in body)) {
      return NextResponse.json(
        { success: false, error: `Champ requis manquant : ${field}` },
        { status: 400 }
      );
    }
  }

  if (typeof body.note !== "number" || body.note < 1 || body.note > 5) {
    return NextResponse.json(
      { success: false, error: "La note doit être un nombre entre 1 et 5" },
      { status: 400 }
    );
  }

  // Validation/normalisation stricte (bornes de longueur, types, source...).
  const candidate = {
    id: generateId(),
    auteur: body.auteur,
    entreprise: body.entreprise || "",
    poste: body.poste || "",
    avatar: body.avatar || "",
    note: body.note,
    contenu: body.contenu,
    reponse: body.reponse || null,
    type: body.type,
    tags: body.tags || [],
    source: body.source || "site",
    marque: body.marque || "insuffle",
    verifie: body.verifie ?? false,
    date: body.date || new Date().toISOString().split("T")[0],
    recommande: body.recommande ?? true,
    ...(body.heroImage ? { heroImage: body.heroImage } : {}),
  };

  const result = validateTemoignage(candidate);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  const temoignages = await getTemoignages();
  temoignages.push(result.value);
  await saveTemoignages(temoignages);

  return NextResponse.json({ success: true, data: result.value }, { status: 201 });
}
