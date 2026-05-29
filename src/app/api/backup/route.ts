import { NextRequest, NextResponse } from "next/server";
import { getFullBackup, restoreBackup } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";
import { validateBackup } from "@/lib/validate";

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

  // Validation stricte du schéma AVANT d'écraser quoi que ce soit.
  const result = validateBackup(body);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: `Backup invalide : ${result.error}` },
      { status: 400 }
    );
  }

  await restoreBackup(result.value);

  return NextResponse.json({
    success: true,
    message: `Restauration effectuée : ${result.value.temoignages.length} témoignages, ${result.value.types.length} types`,
  });
}
