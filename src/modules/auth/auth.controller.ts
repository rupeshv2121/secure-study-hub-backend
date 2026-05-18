import type { Request, Response } from "express";
import { env } from "../../config/env";
import { loginSchema, registerSchema } from "./auth.schema";
import { createFromSupabase, login, register } from "./auth.service";

// Webhook handler for Supabase Auth events
export const webhookFromSupabaseController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const secret = req.headers["x-supabase-webhook-secret"] as string | undefined;

  if (env.SUPABASE_WEBHOOK_SECRET && env.SUPABASE_WEBHOOK_SECRET !== secret) {
    res.status(401).json({ success: false, message: "Invalid webhook secret" });
    return;
  }

  const body = req.body as any;

  // Try to extract user info from common payload shapes
  const user = body?.user ?? body?.record ?? body?.data?.user ?? body;
  const event = body?.type ?? body?.event ?? body?.event_type ?? null;

  // Only handle user created events
  if (event && !/create|created|user.created/i.test(String(event))) {
    res.status(200).json({ success: true, message: "Event ignored" });
    return;
  }

  const email = user?.email;
  const name =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.fullName ??
    user?.name ??
    "";
  const supabaseId = user?.id ?? user?.user_id ?? user?.uid ?? null;

  if (!email) {
    res
      .status(400)
      .json({
        success: false,
        message: "Missing user email in webhook payload",
      });
    return;
  }

  const created = await createFromSupabase({
    supabaseId: supabaseId ?? undefined,
    email,
    name,
  });

  res
    .status(201)
    .json({ success: true, message: "User synced", data: created });
};

export const registerController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = registerSchema.parse(req.body);
  const result = await register(payload);

  res.status(201).json({
    success: true,
    message: "Account created",
    data: result,
  });
};

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = loginSchema.parse(req.body);
  const result = await login(payload);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
};

export const syncFromSupabaseController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, name } = req.body as { email: string; name?: string };

  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const user = await createFromSupabase({ email, name: name || "" });

  res.status(201).json({ success: true, message: "User synced", data: user });
};
