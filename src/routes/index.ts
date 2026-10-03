import { Router } from "express";
import { envIssues } from "../config/env";
import { prisma } from "../lib/prisma";
import { adminOnly, authMiddleware } from "../middlewares/auth.middleware";
import { updateMeController } from "../modules/auth/auth.controller";
import { authRouter } from "../modules/auth/auth.routes";
import { categoryRouter } from "../modules/categories/category.routes";
import { externalRouter } from "../modules/external/external.routes";
import { feedbackRouter } from "../modules/feedback/feedback.routes";
import { lectureRouter } from "../modules/lectures/lecture.routes";
import { lectureSlideRouter } from "../modules/lectureSlides/slides.routes";
import { purchaseRouter } from "../modules/purchases/purchase.routes";
import { storageRouter } from "../modules/storage/storage.routes";
import { subjectRouter } from "../modules/subjects/subject.routes";
import { viewLogsRouter } from "../modules/viewLogs/viewLogs.routes";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

// "Active" = opened at least one lecture in the window; lecture views are the
// only per-user activity the database records.
const countActiveUsers = async (since: Date) => {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "userId") AS count FROM "ViewLog" WHERE "createdAt" >= ${since}`;
  return Number(rows[0]?.count ?? 0);
};

const countPayingUsers = async () => {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "userId") AS count FROM "Purchase"
    WHERE "status" IN ('APPROVED', 'COMPLETED')`;
  return Number(rows[0]?.count ?? 0);
};

router.get("/health", (_req, res) => {
  if (envIssues) {
    res.status(500).json({
      success: false,
      message: "Backend booted but environment is misconfigured",
      envIssues,
    });
    return;
  }
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
router.use("/feedbacks", feedbackRouter);
router.use("/storage", storageRouter);
router.use("/external", externalRouter);
router.use("/purchases", purchaseRouter);

// Public, aggregate-only counts for the homepage. No personal data; cached
// briefly by browsers/CDNs so it can't be used to hammer the database.
router.get("/stats/public", async (_req, res, next) => {
  try {
    const [students, subjects, lectures, views] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.subject.count({ where: { isActive: true } }),
      prisma.lecture.count({ where: { published: true } }),
      prisma.lecture.aggregate({
        _sum: { viewCount: true },
        where: { published: true },
      }),
    ]);

    res.set("Cache-Control", "public, max-age=300");
    res.json({
      success: true,
      data: {
        students,
        subjects,
        lectures,
        views: views._sum.viewCount ?? 0,
      },
    });
  } catch (e) {
    next(e);
  }
});

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

// Admin stats endpoint used by the admin dashboard
router.get(
  "/admin/stats",
  authMiddleware,
  adminOnly,
  async (req, res, next) => {
    try {
      // aggregate totals
      const totalUsers = await prisma.user.count();
      const totalLectures = await prisma.lecture.count();
      const totalCategories = await prisma.category.count();

      const [
        activeUsers24h,
        activeUsers7d,
        activeUsers30d,
        newUsers30d,
        payingUsers,
      ] = await Promise.all([
        countActiveUsers(daysAgo(1)),
        countActiveUsers(daysAgo(7)),
        countActiveUsers(daysAgo(30)),
        prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
        countPayingUsers(),
      ]);

      const viewsSum = await prisma.lecture.aggregate({
        _sum: { viewCount: true },
      });
      const totalViews = (viewsSum._sum.viewCount as number) || 0;

      // recent view logs (10 most recent) with lecture title and user email
      const recentLogs = await prisma.viewLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      const userIds = Array.from(new Set(recentLogs.map((r) => r.userId)));
      const lectureIds = Array.from(
        new Set(recentLogs.map((r) => r.lectureId)),
      );

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });
      const lectures = await prisma.lecture.findMany({
        where: { id: { in: lectureIds } },
        select: { id: true, title: true },
      });

      const usersMap = new Map(users.map((u) => [u.id, u.email]));
      const lecturesMap = new Map(lectures.map((l) => [l.id, l.title]));

      const recentViews = recentLogs.map((r) => ({
        lecture_id: r.lectureId,
        lecture_title: lecturesMap.get(r.lectureId) || "Unknown",
        user_id: r.userId,
        user_email: usersMap.get(r.userId) || "Unknown",
        viewed_at: r.createdAt,
      }));

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers24h,
          activeUsers7d,
          activeUsers30d,
          newUsers30d,
          payingUsers,
          totalLectures,
          totalCategories,
          totalViews,
          recentViews,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

export { router };
