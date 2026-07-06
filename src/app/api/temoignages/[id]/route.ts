import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages } from "@/lib/db";
import { requireAuth, isAdmin } from "@/lib/auth";
import type { Temoignage } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const temoignages = await getTemoignages();
  const temoignage = temoignages.find((t) => t.id === id);

  if (!temoignage) {
    return NextResponse.json(
      { success: false, error: "Témoignage non trouvé" },
      { status: 404 }
    );
  }

  const admin = isAdmin(request);

  // Non-admin : un témoignage non publié n'est pas accessible, et les champs
  // privés (préfixés "_", ex. email du soumissionnaire) sont retirés.
  if (!admin) {
    if (temoignage.publie === false) {
      return NextResponse.json(
        { success: false, error: "Témoignage non trouvé" },
        { status: 404 }
      );
    }
    const champsPublics = temoignage.champsPersonnalises
      ? Object.fromEntries(
          Object.entries(temoignage.champsPersonnalises).filter(([k]) => !k.startsWith("_"))
        )
      : undefined;
    return NextResponse.json({
      success: true,
      data: { ...temoignage, champsPersonnalises: champsPublics },
    });
  }

  return NextResponse.json({ success: true, data: temoignage });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const temoignages = await getTemoignages();
  const index = temoignages.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Témoignage non trouvé" },
      { status: 404 }
    );
  }

  if (body.note !== undefined) {
    if (typeof body.note !== "number" || body.note < 1 || body.note > 5) {
      return NextResponse.json(
        { success: false, error: "La note doit être un nombre entre 1 et 5" },
        { status: 400 }
      );
    }
  }

  const updated: Temoignage = {
    ...temoignages[index],
    ...body,
    id,
  };
  // Un témoignage archivé ne peut pas être publié : restaurer d'abord.
  if (updated.archive) updated.publie = false;

  temoignages[index] = updated;
  await saveTemoignages(temoignages);

  return NextResponse.json({ success: true, data: updated });
}

/**
 * SÉCURITÉ DONNÉES : il n'existe AUCUNE suppression physique de témoignage.
 * DELETE archive (archive: true, dépublié) — le témoignage reste dans le
 * fichier et peut être restauré à tout moment (PUT { archive: false }).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const temoignages = await getTemoignages();
  const index = temoignages.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Témoignage non trouvé" },
      { status: 404 }
    );
  }

  temoignages[index] = { ...temoignages[index], archive: true, publie: false };
  await saveTemoignages(temoignages);

  return NextResponse.json({
    success: true,
    data: temoignages[index],
    message: "Témoignage archivé (jamais supprimé) — restaurable à tout moment",
  });
}
