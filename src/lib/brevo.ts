interface BrevoEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Destinataire par défaut des notifications (nouveau témoignage, contact). */
const NOTIFICATION_PAR_DEFAUT = "contact@insuffle.com";

/**
 * Adresse qui reçoit les notifications : CONTACT_EMAIL si défini,
 * sinon contact@insuffle.com.
 */
export function getNotificationEmail(): string {
  const v = (process.env.CONTACT_EMAIL || "").trim();
  return v || NOTIFICATION_PAR_DEFAUT;
}

/** Vrai si l'envoi d'emails est possible (clé Brevo + expéditeur). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

/** Échappe les caractères HTML pour neutraliser toute injection / XSS. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Texte brut (modèle d'email) → HTML sûr : échappé, retours à la ligne
 * conservés, URLs rendues cliquables.
 */
export function texteVersHtml(texte: string): string {
  const html = escapeHtml(texte).replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    '<a href="$1" style="color:#1f3a8b;font-weight:600">$1</a>'
  );
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;white-space:pre-line;max-width:600px">${html}</div>`;
}

export async function sendEmail({ to, subject, html, replyTo }: BrevoEmail): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Clé Brevo non configurée (BREVO_API_KEY)" };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Insuffle";
  if (!senderEmail) {
    return { success: false, error: "Email expéditeur non configuré (BREVO_SENDER_EMAIL)" };
  }

  const body = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  };

  // BREVO_API_URL : surcharge réservée aux tests (faux serveur Brevo local).
  const url = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Brevo error ${response.status}: ${err.slice(0, 300)}` };
    }

    const result = await response.json().catch(() => ({}));
    return { success: true, messageId: result.messageId };
  } catch (e) {
    return { success: false, error: `Brevo injoignable : ${e instanceof Error ? e.message : String(e)}` };
  }
}
