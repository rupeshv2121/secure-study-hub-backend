import { Router } from "express";
import { adminOnly, authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createController,
  deleteController,
  getController,
  listController,
  updateController,
} from "./lecture.controller";

const router = Router();

router.get("/", asyncHandler(listController));
router.get("/:id", asyncHandler(getController));
router.post("/", authMiddleware, adminOnly, asyncHandler(createController));
router.put("/:id", authMiddleware, adminOnly, asyncHandler(updateController));
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  asyncHandler(deleteController),
);

export { router as lectureRouter };
