import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/brevo";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const required = ["nom", "email", "message"];
  for (const field of required) {
    if (!(field in body) || !body[field]?.trim()) {
      return NextResponse.json(
        { success: false, error: `Champ requis manquant : ${field}` },
        { status: 400 }
      );
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return NextResponse.json(
      { success: false, error: "Format d'email invalide" },
      { status: 400 }
    );
  }

  const destinataire = process.env.CONTACT_EMAIL;
  if (!destinataire) {
    return NextResponse.json(
      { success: false, error: "Email de contact non configuré sur le serveur" },
      { status: 500 }
    );
  }

  const html = `
    <h2>Nouveau message de contact</h2>
    <p><strong>Nom :</strong> ${body.nom}</p>
    <p><strong>Email :</strong> ${body.email}</p>
    ${body.entreprise ? `<p><strong>Entreprise :</strong> ${body.entreprise}</p>` : ""}
    ${body.telephone ? `<p><strong>Téléphone :</strong> ${body.telephone}</p>` : ""}
    <hr/>
    <p>${body.message.replace(/\n/g, "<br/>")}</p>
  `;

  const result = await sendEmail({
    to: destinataire,
    subject: `[Boussole 4C] Message de ${body.nom}`,
    html,
    replyTo: body.email,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Message envoyé avec succès",
  });
}
