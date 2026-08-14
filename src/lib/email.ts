import { Resend } from "resend";

/**
 * Integración de correo (preparada para el futuro).
 * Si no hay RESEND_API_KEY, `sendEmail` no envía nada y solo deja traza.
 */
const apiKey = process.env.RESEND_API_KEY?.trim();

export const isEmailEnabled = Boolean(apiKey);

const resend = isEmailEnabled ? new Resend(apiKey) : null;

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.info("[email:deshabilitado]", params.subject, "->", params.to);
    return { sent: false as const, reason: "RESEND_API_KEY no configurada" };
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { sent: true as const, result };
}
