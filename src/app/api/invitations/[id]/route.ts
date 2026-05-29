import { NextRequest, NextResponse } from "next/server";
import { getInvitations, saveInvitations } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invitations = await getInvitations();
  const inv = invitations.find((i) => i.id === id);

  if (!inv) {
    return NextResponse.json(
      { success: false, error: "Invitation non trouvée" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: inv.id,
      nom: inv.nom,
      email: inv.email,
      entreprise: inv.entreprise,
      type: inv.type,
      marque: inv.marque,
      message: inv.message,
      used: inv.used,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const invitations = await getInvitations();
  const index = invitations.findIndex((i) => i.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Invitation non trouvée" },
      { status: 404 }
    );
  }

  if (body.used === true) {
    invitations[index].used = true;
    invitations[index].usedAt = new Date().toISOString();
    await saveInvitations(invitations);
  }

  return NextResponse.json({ success: true, data: invitations[index] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const invitations = await getInvitations();
  const index = invitations.findIndex((i) => i.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Invitation non trouvée" },
      { status: 404 }
    );
  }

  const deleted = invitations.splice(index, 1)[0];
  await saveInvitations(invitations);

  return NextResponse.json({ success: true, data: deleted });
}
