import { NextRequest, NextResponse } from "next/server";
import { getTypes, saveTypes } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const types = await getTypes();
  return NextResponse.json({
    success: true,
    count: types.length,
    data: types,
  });
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();

  const required = ["id", "label"];
  for (const field of required) {
    if (!(field in body)) {
      return NextResponse.json(
        { success: false, error: `Champ requis manquant : ${field}` },
        { status: 400 }
      );
    }
  }

  const types = await getTypes();

  if (types.some((t) => t.id === body.id)) {
    return NextResponse.json(
      { success: false, error: "Un type avec cet id existe déjà" },
      { status: 409 }
    );
  }

  const nouveau = {
    id: body.id,
    label: body.label,
    description: body.description || "",
    icon: body.icon || "star",
    color: body.color || "#14b8a6",
  };

  types.push(nouveau);
  await saveTypes(types);

  return NextResponse.json({ success: true, data: nouveau }, { status: 201 });
}
