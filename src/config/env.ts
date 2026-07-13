import { z } from "zod";

// A blank Vercel/Netlify env var arrives as "" (not undefined), which fails
// validators like .email() and .url(). Treat empty/whitespace-only values as
// "unset" so a stray blank variable can't crash the whole app at boot.
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Optional email that degrades to `undefined` (notifications simply skipped)
// instead of throwing when the configured value is blank or malformed — a mail
// misconfiguration must never take down the API.
const optionalNotificationEmail = z
  .preprocess(emptyToUndefined, z.string().trim().email().optional())
  .catch(undefined);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_WEBHOOK_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  // Email notifications (Resend). When RESEND_API_KEY is unset, emails are
  // skipped (logged only) so the app keeps working in dev/local.
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.preprocess(
    emptyToUndefined,
    z.string().default("Secure Study Hub <donot-reply@outfromcumfurt.com>"),
  ),
  ADMIN_NOTIFICATION_EMAIL: optionalNotificationEmail,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
