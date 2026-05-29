import { NextRequest, NextResponse } from "next/server";
import { getEvenements, saveEvenements, generateId } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = isAdmin(request);
  const evenements = await getEvenements();

  if (!admin) {
    const actifs = evenements.filter((e) => e.actif);
    return NextResponse.json({ success: true, count: actifs.length, data: actifs });
  }

  return NextResponse.json({ success: true, count: evenements.length, data: evenements });
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const body = await request.json();

  if (!body.nom || !body.typeId) {
    return NextResponse.json(
      { success: false, error: "Nom et typeId requis" },
      { status: 400 }
    );
  }

  const evenements = await getEvenements();

  const nouveau = {
    id: generateId(),
    nom: body.nom,
    description: body.description || "",
    typeId: body.typeId,
    entreprise: body.entreprise || undefined,
    bannerImage: body.bannerImage || undefined,
    date: body.date || new Date().toISOString().split("T")[0],
    lieu: body.lieu || undefined,
    marque: body.marque === "academie" ? "academie" as const : "insuffle" as const,
    createdAt: new Date().toISOString(),
    actif: body.actif !== undefined ? !!body.actif : true,
  };

  evenements.push(nouveau);
  await saveEvenements(evenements);

  return NextResponse.json({ success: true, data: nouveau }, { status: 201 });
}
