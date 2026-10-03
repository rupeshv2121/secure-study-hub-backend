import { Router } from "express";
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

authRouter.post("/register", asyncHandler(registerController));
authRouter.post("/login", asyncHandler(loginController));
authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
authRouter.post("/reset-password", asyncHandler(resetPasswordController));
authRouter.post("/sync", asyncHandler(syncFromSupabaseController));
// Public endpoint for Supabase to call when users are created (configure webhook)
authRouter.post("/webhook", asyncHandler(webhookFromSupabaseController));

export { authRouter };
