import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createController,
  getController,
  listController,
} from "./purchase.controller";

const router = Router();

router.post("/", authMiddleware, asyncHandler(createController));
router.get("/", authMiddleware, asyncHandler(listController));
router.get("/:id", authMiddleware, asyncHandler(getController));

export { router as purchaseRouter };
