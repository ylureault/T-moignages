import { NextRequest, NextResponse } from "next/server";
import { getEvenements, saveEvenements, getTypes } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const evenements = await getEvenements();
  const evt = evenements.find((e) => e.id === id);

  if (!evt) {
    return NextResponse.json(
      { success: false, error: "Événement non trouvé" },
      { status: 404 }
    );
  }

  const types = await getTypes();
  const type = types.find((t) => t.id === evt.typeId);

  return NextResponse.json({
    success: true,
    data: evt,
    type: type || null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const evenements = await getEvenements();
  const index = evenements.findIndex((e) => e.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Événement non trouvé" },
      { status: 404 }
    );
  }

  if (body.nom !== undefined) evenements[index].nom = body.nom;
  if (body.description !== undefined) evenements[index].description = body.description;
  if (body.typeId !== undefined) evenements[index].typeId = body.typeId;
  if (body.date !== undefined) evenements[index].date = body.date;
  if (body.lieu !== undefined) evenements[index].lieu = body.lieu;
  if (body.marque !== undefined) evenements[index].marque = body.marque;
  if (body.actif !== undefined) evenements[index].actif = body.actif;

  await saveEvenements(evenements);

  return NextResponse.json({ success: true, data: evenements[index] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const evenements = await getEvenements();
  const index = evenements.findIndex((e) => e.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Événement non trouvé" },
      { status: 404 }
    );
  }

  const deleted = evenements.splice(index, 1)[0];
  await saveEvenements(evenements);

  return NextResponse.json({ success: true, data: deleted });
}
