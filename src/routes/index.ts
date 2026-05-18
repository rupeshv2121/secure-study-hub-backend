import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authRouter } from "../modules/auth/auth.routes";
import { categoryRouter } from "../modules/categories/category.routes";
import { lectureRouter } from "../modules/lectures/lecture.routes";
import { lectureSlideRouter } from "../modules/lectureSlides/slides.routes";
import { purchaseRouter } from "../modules/purchases/purchase.routes";
import { storageRouter } from "../modules/storage/storage.routes";
import { subjectRouter } from "../modules/subjects/subject.routes";
import { viewLogsRouter } from "../modules/viewLogs/viewLogs.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Secure Study Hub backend is running",
  });
});

router.use("/auth", authRouter);
router.use("/subjects", subjectRouter);
router.use("/categories", categoryRouter);
router.use("/lectures", lectureRouter);
router.use("/lecture-slides", lectureSlideRouter);
router.use("/view-logs", viewLogsRouter);
router.use("/storage", storageRouter);
router.use("/purchases", purchaseRouter);

// Protected demo endpoint - returns current user
router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user ?? null });
});

// Allow updating current user (name, password)
import { updateMeController } from "../modules/auth/auth.controller";
router.put("/me", authMiddleware, async (req, res, next) => {
  try {
    await updateMeController(req, res as any);
  } catch (e) {
    next(e);
  }
});

export { router };
