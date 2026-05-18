import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authRouter } from "../modules/auth/auth.routes";
import { lectureRouter } from "../modules/lectures/lecture.routes";
import { purchaseRouter } from "../modules/purchases/purchase.routes";
import { subjectRouter } from "../modules/subjects/subject.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Secure Study Hub backend is running",
  });
});

router.use("/auth", authRouter);
router.use("/subjects", subjectRouter);
router.use("/lectures", lectureRouter);
router.use("/purchases", purchaseRouter);

// Protected demo endpoint - returns current user
router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user ?? null });
});

export { router };
