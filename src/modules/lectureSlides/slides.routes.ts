import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createController,
  deleteController,
  listController,
} from "./slides.controller";

const router = Router();

router.get("/", asyncHandler(listController)); // ?lectureId=...
router.post("/", authMiddleware, asyncHandler(createController));
router.delete("/:id", authMiddleware, asyncHandler(deleteController));

export { router as lectureSlideRouter };
