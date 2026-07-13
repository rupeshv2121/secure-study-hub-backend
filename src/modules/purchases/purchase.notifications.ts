import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { sendMail } from "../../lib/email";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const adminPanelUrl = (): string => {
  // CORS_ORIGIN may be a comma-separated list; use the first origin.
  const base = env.CORS_ORIGIN.split(",")[0]?.trim().replace(/\/$/, "");
  return `${base}/admin`;
};

/**
 * Notify the admin that a student has submitted a new purchase request.
 *
 * Self-contained and fault-tolerant: it re-reads the purchase with a safe
 * field selection (no password hash) and swallows any error so purchase
 * creation is never affected by email delivery.
 */
export const notifyAdminOfPurchaseRequest = async (
  purchaseId: string,
): Promise<void> => {
  try {
    if (!env.ADMIN_NOTIFICATION_EMAIL) {
      console.warn(
        "[email] ADMIN_NOTIFICATION_EMAIL not set — skipping purchase notification",
      );
      return;
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        amount: true,
        currency: true,
        metadata: true,
        createdAt: true,
        user: { select: { name: true, email: true, phoneNumber: true } },
        subject: { select: { title: true, price: true } },
      },
    });

    if (!purchase) return;

    const studentName = purchase.user?.name ?? "Unknown student";
    const studentEmail = purchase.user?.email ?? "—";
    const studentPhone = purchase.user?.phoneNumber ?? "—";
    const subjectTitle = purchase.subject?.title ?? "Notes";
    const amount = `${purchase.currency} ${purchase.amount}`;
    const note =
      purchase.metadata &&
      typeof purchase.metadata === "object" &&
      "note" in purchase.metadata
        ? String((purchase.metadata as Record<string, unknown>).note ?? "")
        : "";
    const submittedAt = purchase.createdAt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const reviewUrl = adminPanelUrl();

    const rows: Array<[string, string]> = [
      ["Subject", subjectTitle],
      ["Amount paid", amount],
      ["Student", studentName],
      ["Email", studentEmail],
      ["Phone", studentPhone],
      ["Submitted", `${submittedAt} IST`],
    ];
    if (note) rows.push(["Student note", note]);

    const rowsHtml = rows
      .map(
        ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(
            label,
          )}</td>
          <td style="padding:8px 12px;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(
            value,
          )}</td>
        </tr>`,
      )
      .join("");

    const html = `
    <div style="background:#f3f4f6;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#4f46e5;padding:20px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;">🔔 New purchase request</h1>
          <p style="margin:4px 0 0;color:#c7d2fe;font-size:13px;">A student is waiting for approval</p>
        </div>
        <div style="padding:20px 24px;">
          <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
          <a href="${reviewUrl}" style="display:inline-block;margin-top:20px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Review &amp; approve →</a>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Reply to this email to reach the student directly.</p>
        </div>
      </div>
    </div>`;

    const text = [
      "New purchase request — waiting for approval",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      `Review & approve: ${reviewUrl}`,
    ].join("\n");

    await sendMail({
      to: env.ADMIN_NOTIFICATION_EMAIL,
      subject: `New purchase request: ${subjectTitle} — ${studentName}`,
      html,
      text,
      replyTo: purchase.user?.email,
    });
  } catch (err) {
    console.error("[email] failed to send purchase notification:", err);
  }
};
