import { NextRequest, NextResponse } from "next/server";
import { getFullBackup, restoreBackup } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const backup = await getFullBackup();

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-temoignages-${backup.exportDate.split("T")[0]}.json"`,
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();

  if (!body.temoignages || !Array.isArray(body.temoignages)) {
    return NextResponse.json(
      { success: false, error: "Format invalide : 'temoignages' (array) requis" },
      { status: 400 }
    );
  }

  if (!body.types || !Array.isArray(body.types)) {
    return NextResponse.json(
      { success: false, error: "Format invalide : 'types' (array) requis" },
      { status: 400 }
    );
  }

  await restoreBackup({
    temoignages: body.temoignages,
    types: body.types,
  });

  return NextResponse.json({
    success: true,
    message: `Restauration effectuée : ${body.temoignages.length} témoignages, ${body.types.length} types`,
  });
}
