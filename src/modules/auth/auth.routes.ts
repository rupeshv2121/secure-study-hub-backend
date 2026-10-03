import { Router } from "express";
import { rateLimit } from "../../middlewares/rate-limit.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  forgotPasswordController,
  loginController,
  registerController,
  resetPasswordController,
  syncFromSupabaseController,
  webhookFromSupabaseController,
} from "./auth.controller";

const authRouter = Router();

const RESET_LIMIT_MESSAGE =
  "Too many reset requests. Please wait a while and try again.";

// Per client IP: stops one caller from hammering the endpoint.
const forgotPasswordIpLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (req) => `ip:${req.ip}`,
  message: RESET_LIMIT_MESSAGE,
});

// Per target email: stops anyone (from any IP) flooding one inbox. Counted
// whether or not the account exists, so a 429 reveals nothing about it.
const forgotPasswordEmailLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  key: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" && email.trim()
      ? `email:${email.trim().toLowerCase()}`
      : undefined;
  },
  message: RESET_LIMIT_MESSAGE,
});

authRouter.post("/register", asyncHandler(registerController));
authRouter.post("/login", asyncHandler(loginController));
authRouter.post(
  "/forgot-password",
  forgotPasswordIpLimit,
  forgotPasswordEmailLimit,
  asyncHandler(forgotPasswordController),
);
authRouter.post("/reset-password", asyncHandler(resetPasswordController));
authRouter.post("/sync", asyncHandler(syncFromSupabaseController));
// Public endpoint for Supabase to call when users are created (configure webhook)
authRouter.post("/webhook", asyncHandler(webhookFromSupabaseController));

export { authRouter };
