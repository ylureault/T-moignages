import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getInvitations, saveInvitations } from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const invitations = await getInvitations();
  return NextResponse.json({ success: true, data: invitations });
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const body = await request.json();

  const id = randomBytes(16).toString("hex");

  const invitation = {
    id,
    nom: typeof body.nom === "string" ? body.nom.trim().slice(0, 200) : "",
    email: typeof body.email === "string" ? body.email.trim().slice(0, 254) : "",
    entreprise: typeof body.entreprise === "string" ? body.entreprise.trim().slice(0, 200) : "",
    type: typeof body.type === "string" ? body.type.trim() : "",
    marque: body.marque === "academie" ? "academie" as const : "insuffle" as const,
    message: typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "",
    createdAt: new Date().toISOString(),
    used: false,
  };

  const invitations = await getInvitations();
  invitations.push(invitation);
  await saveInvitations(invitations);

  return NextResponse.json({ success: true, data: invitation }, { status: 201 });
}
