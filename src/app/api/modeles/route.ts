import { NextRequest, NextResponse } from "next/server";
import { getModeles, saveModeles, generateId } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { validateModele } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const modeles = await getModeles();
  return NextResponse.json({ success: true, data: modeles });
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const result = validateModele({ ...body, id: body.id || generateId() });
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  const modeles = await getModeles();
  if (modeles.some((m) => m.id === result.value.id)) {
    return NextResponse.json(
      { success: false, error: "Un modèle avec cet id existe déjà" },
      { status: 409 }
    );
  }
  modeles.push(result.value);
  await saveModeles(modeles);

  return NextResponse.json({ success: true, data: result.value }, { status: 201 });
}
