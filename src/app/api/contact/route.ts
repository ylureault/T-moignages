import { NextRequest, NextResponse } from "next/server";
import { sendEmail, escapeHtml } from "@/lib/brevo";

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
  if (!emailRegex.test(body.email) || body.email.length > 254) {
    return NextResponse.json(
      { success: false, error: "Format d'email invalide" },
      { status: 400 }
    );
  }

  // Bornes de longueur pour éviter les abus / payloads volumineux.
  if (body.message.length > 5000 || body.nom.length > 200) {
    return NextResponse.json(
      { success: false, error: "Contenu trop long" },
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

  // Toutes les valeurs utilisateur sont échappées avant insertion HTML.
  const nom = escapeHtml(body.nom);
  const email = escapeHtml(body.email);
  const entreprise = body.entreprise ? escapeHtml(body.entreprise) : "";
  const telephone = body.telephone ? escapeHtml(body.telephone) : "";
  const message = escapeHtml(body.message).replace(/\n/g, "<br/>");

  const html = `
    <h2>Nouveau message de contact</h2>
    <p><strong>Nom :</strong> ${nom}</p>
    <p><strong>Email :</strong> ${email}</p>
    ${entreprise ? `<p><strong>Entreprise :</strong> ${entreprise}</p>` : ""}
    ${telephone ? `<p><strong>Téléphone :</strong> ${telephone}</p>` : ""}
    <hr/>
    <p>${message}</p>
  `;

  const result = await sendEmail({
    to: destinataire,
    subject: `[Boussole 4C] Message de ${nom}`,
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
