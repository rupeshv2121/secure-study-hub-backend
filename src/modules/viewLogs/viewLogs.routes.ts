import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { createController } from "./viewLogs.controller";

const router = Router();

router.post("/", authMiddleware, asyncHandler(createController));

export { router as viewLogsRouter };
