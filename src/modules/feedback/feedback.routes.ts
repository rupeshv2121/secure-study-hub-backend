import { Router } from "express";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  approveController,
  createController,
  listAllController,
  listPublicController,
} from "./feedback.controller";

const router = Router();

// public listing of approved feedbacks
router.get("/public", asyncHandler(listPublicController));

// create feedback (optional auth)
router.post("/", asyncHandler(createController));

// admin-only management
router.get("/", authMiddleware, adminOnly, asyncHandler(listAllController));
router.put(
  "/:id/approve",
  authMiddleware,
  adminOnly,
  asyncHandler(approveController),
);

export { router as feedbackRouter };
