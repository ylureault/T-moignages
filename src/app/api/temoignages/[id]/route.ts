import { NextRequest, NextResponse } from "next/server";
import { getTemoignages, saveTemoignages } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";
import type { Temoignage } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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

  return NextResponse.json({ success: true, data: temoignage });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
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

  temoignages[index] = updated;
  await saveTemoignages(temoignages);

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
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

  const deleted = temoignages.splice(index, 1)[0];
  await saveTemoignages(temoignages);

  return NextResponse.json({ success: true, data: deleted });
}
