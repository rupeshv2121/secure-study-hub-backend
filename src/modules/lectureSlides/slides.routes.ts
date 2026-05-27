import { Router } from "express";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createController,
  deleteController,
  listController,
} from "./slides.controller";

const router = Router();

router.get("/", authMiddleware, asyncHandler(listController)); // ?lectureId=...
router.post("/", authMiddleware, adminOnly, asyncHandler(createController));
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  asyncHandler(deleteController),
);

export { router as lectureSlideRouter };
