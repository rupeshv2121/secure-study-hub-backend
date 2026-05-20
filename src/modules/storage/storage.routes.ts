import { Router } from "express";
import multer from "multer";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  removeController,
  signedUrlController,
  uploadController,
} from "./storage.controller";

const router = Router();

const upload = multer({ dest: "tmp/uploads" });

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

export { router as storageRouter };
