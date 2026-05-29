import { NextRequest, NextResponse } from "next/server";
import { getTypes, saveTypes } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const types = await getTypes();
  const index = types.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Type non trouvé" },
      { status: 404 }
    );
  }

  types[index] = { ...types[index], ...body, id };
  await saveTypes(types);

  return NextResponse.json({ success: true, data: types[index] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  const types = await getTypes();
  const index = types.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Type non trouvé" },
      { status: 404 }
    );
  }

  const deleted = types.splice(index, 1)[0];
  await saveTypes(types);

  return NextResponse.json({ success: true, data: deleted });
}
