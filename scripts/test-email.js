// Quick check that your Resend setup can actually deliver mail.
// Usage:  node scripts/test-email.js
// Reads RESEND_API_KEY, EMAIL_FROM and ADMIN_NOTIFICATION_EMAIL from .env
require("dotenv").config();
const { Resend } = require("resend");

(async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Secure Study Hub <onboarding@resend.dev>";
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!apiKey) {
    console.error("✗ RESEND_API_KEY is not set in .env");
    process.exitCode = 1;
    return;
  }
  if (!to) {
    console.error("✗ ADMIN_NOTIFICATION_EMAIL is not set in .env");
    process.exitCode = 1;
    return;
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "✅ Secure Study Hub — test email",
    html: "<p>If you can read this, purchase notifications will work. 🎉</p>",
    text: "If you can read this, purchase notifications will work.",
  });

  if (error) {
    console.error("✗ Resend rejected the send:", error);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Sent to ${to} (id: ${data?.id})`);
})();
