interface BrevoEmail {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
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

export async function sendEmail({ to, subject, html, replyTo }: BrevoEmail): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Clé Brevo non configurée (BREVO_API_KEY)" };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Boussole 4C";
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

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Brevo error ${response.status}: ${err}` };
  }

  const result = await response.json();
  return { success: true, messageId: result.messageId };
}
