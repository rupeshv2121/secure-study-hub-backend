import { z } from "zod";

// A blank Vercel/Netlify env var arrives as "" (not undefined), which fails
// validators like .email(), .url() and .min(1) and — because parsing runs at
// module load with process.exit(1) below — crashes the ENTIRE serverless
// function (FUNCTION_INVOCATION_FAILED on every route). Treat empty/whitespace
// values as "unset" so a stray blank variable can never take the app down.
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Optional plain string: blank -> undefined.
const optionalStr = z.preprocess(emptyToUndefined, z.string().optional());

// Optional string with a format check that degrades to `undefined` (feature
// simply stays off) instead of throwing when the value is blank or malformed.
const optionalUrl = z
  .preprocess(emptyToUndefined, z.string().url().optional())
  .catch(undefined);

const optionalEmail = z
  .preprocess(emptyToUndefined, z.string().trim().email().optional())
  .catch(undefined);

// String with a default that also kicks in for blank values.
const withDefault = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().default(fallback));

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(4000),
  ),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: withDefault("7d"),
  CORS_ORIGIN: withDefault("http://localhost:5173"),
  SUPABASE_WEBHOOK_SECRET: optionalStr,
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalStr,
  GOOGLE_SERVICE_ACCOUNT_JSON: optionalStr,
  GOOGLE_DRIVE_FOLDER_ID: optionalStr,
  // Email notifications (Resend). When RESEND_API_KEY is unset, emails are
  // skipped (logged only) so the app keeps working in dev/local.
  RESEND_API_KEY: optionalStr,
  EMAIL_FROM: withDefault("Secure Study Hub <onboarding@resend.dev>"),
  ADMIN_NOTIFICATION_EMAIL: optionalEmail,
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

// Which env vars failed validation (field name -> messages). null when all good.
// Contains NO secret values — only key names and validation messages — so it is
// safe to surface from /api/health for diagnosis.
export const envIssues: Record<string, string[] | undefined> | null =
  parsed.success ? null : parsed.error.flatten().fieldErrors;

if (envIssues) {
  console.error("Invalid environment variables:", envIssues);
}

// Boot even when config is invalid instead of process.exit(1): on serverless a
// hard exit turns EVERY request into an opaque FUNCTION_INVOCATION_FAILED with
// no clue why. Falling back to a best-effort env lets /api/health report the
// exact misconfigured keys. Once the keys are fixed, envIssues is null and the
// app runs normally.
export const env: Env = parsed.success
  ? parsed.data
  : ({
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) || "development",
      PORT: Number(process.env.PORT) || 4000,
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      JWT_SECRET: process.env.JWT_SECRET ?? "",
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
      CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
      SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET || undefined,
      SUPABASE_URL: process.env.SUPABASE_URL || undefined,
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
      GOOGLE_SERVICE_ACCOUNT_JSON:
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON || undefined,
      GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || undefined,
      RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
      EMAIL_FROM:
        process.env.EMAIL_FROM || "Secure Study Hub <onboarding@resend.dev>",
      ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || undefined,
    } as Env);
