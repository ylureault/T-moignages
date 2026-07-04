import { NextRequest, NextResponse } from "next/server";
import { getModeles, saveModeles } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateModele } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const modeles = await getModeles();
  const index = modeles.findIndex((m) => m.id === id);
  if (index === -1) {
    return NextResponse.json({ success: false, error: "Modèle non trouvé" }, { status: 404 });
  }

  const result = validateModele({ ...modeles[index], ...body, id });
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  modeles[index] = result.value;
  await saveModeles(modeles);

  return NextResponse.json({ success: true, data: result.value });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const modeles = await getModeles();
  const index = modeles.findIndex((m) => m.id === id);
  if (index === -1) {
    return NextResponse.json({ success: false, error: "Modèle non trouvé" }, { status: 404 });
  }

  const deleted = modeles.splice(index, 1)[0];
  await saveModeles(modeles);

  return NextResponse.json({ success: true, data: deleted });
}
