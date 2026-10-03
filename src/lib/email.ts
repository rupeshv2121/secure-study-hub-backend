import { Resend } from "resend";
import { env } from "../config/env";

let resendClient: Resend | null = null;

const getResend = (): Resend | null => {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Public URL of the web app, for links in emails. CORS_ORIGIN may be a
// comma-separated list; the first origin is used.
export const appBaseUrl = (): string =>
  (env.CORS_ORIGIN.split(",")[0] ?? "").trim().replace(/\/$/, "");

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend.
 *
 * Never throws: if the API key is missing or Resend returns an error we log it
 * and return `false`, so callers (e.g. purchase creation) are never broken by a
 * mail failure.
 */
export const sendMail = async (options: SendMailOptions): Promise<boolean> => {
  const resend = getResend();

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping email "${options.subject}"`,
    );
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return false;
    }

    console.log(`[email] sent "${options.subject}" (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error("[email] unexpected send failure:", err);
    return false;
  }
};
