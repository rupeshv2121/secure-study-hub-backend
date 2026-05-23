import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middlewares/auth.middleware";
import { updateMeController } from "../modules/auth/auth.controller";
import { authRouter } from "../modules/auth/auth.routes";
import { categoryRouter } from "../modules/categories/category.routes";
import { externalRouter } from "../modules/external/external.routes";
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
router.use("/external", externalRouter);
router.use("/purchases", purchaseRouter);

// Protected profile endpoint - returns persisted current user profile
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const authUser = req.user as { id?: string } | undefined;
    if (!authUser?.id) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

router.put("/me", authMiddleware, async (req, res, next) => {
  try {
    await updateMeController(req, res as any);
  } catch (e) {
    next(e);
  }
});

export { router };
