import { NextRequest, NextResponse } from "next/server";
import temoignagesData from "@/data/temoignages.json";
import type { Temoignage } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const temoignage = (temoignagesData as Temoignage[]).find(
    (t) => t.id === id
  );

  if (!temoignage) {
    return NextResponse.json(
      { success: false, error: "Témoignage non trouvé" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: temoignage,
  });
}
