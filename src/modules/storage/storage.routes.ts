import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  existsController,
  removeController,
  signedUrlController,
  uploadController,
} from "./storage.controller";

const router = Router();

const uploadDir = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join("tmp", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

router.post(
  "/:bucket/upload",
  authMiddleware,
  adminOnly,
  upload.single("file"),
  asyncHandler(uploadController),
);
router.post(
  "/:bucket/remove",
  authMiddleware,
  adminOnly,
  asyncHandler(removeController),
);
router.get(
  "/:bucket/signed-url",
  authMiddleware,
  asyncHandler(signedUrlController),
);

// Debug: check if an object exists under a bucket (lists parent folder and searches)
router.get(
  "/:bucket/exists",
  authMiddleware,
  asyncHandler(existsController),
);

export { router as storageRouter };
