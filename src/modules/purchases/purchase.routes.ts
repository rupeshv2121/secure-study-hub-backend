import { Router } from "express";
import multer from "multer";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createController,
  getController,
  listController,
  reviewController,
} from "./purchase.controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post(
  "/",
  authMiddleware,
  upload.single("screenshot"),
  asyncHandler(createController),
);
router.get("/", authMiddleware, asyncHandler(listController));
router.get("/:id", authMiddleware, asyncHandler(getController));
router.post(
  "/:id/review",
  authMiddleware,
  adminOnly,
  asyncHandler(reviewController),
);

export { router as purchaseRouter };
