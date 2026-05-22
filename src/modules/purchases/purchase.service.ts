import { prisma } from "../../lib/prisma";
import type {
  CreatePurchaseInput,
  ReviewPurchaseInput,
} from "./purchase.schema";

const enrichPurchase = async (purchase: any) => {
  let screenshotUrl: string | null = null;

  if (purchase?.screenshotPath) {
    if (String(purchase.screenshotPath).startsWith("data:")) {
      screenshotUrl = purchase.screenshotPath;
    } else {
      screenshotUrl = purchase.screenshotPath;
    }
  }

  return {
    ...purchase,
    screenshotUrl,
  };
};

export const createPurchase = async (
  userId: string,
  payload: CreatePurchaseInput,
  screenshotFile?: Express.Multer.File,
) => {
  let screenshotPath: string | null = null;

  if (screenshotFile) {
    const mimeType = screenshotFile.mimetype || "application/octet-stream";
    screenshotPath = `data:${mimeType};base64,${screenshotFile.buffer.toString(
      "base64",
    )}`;
  }

  return prisma.purchase.create({
    data: {
      userId,
      subjectId: payload.subjectId,
      amount: payload.amount,
      currency: payload.currency,
      screenshotPath: screenshotPath ?? undefined,
      metadata: payload.note ? { note: payload.note } : undefined,
    },
  });
};

export const getPurchase = async (id: string) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      lecture: {
        include: {
          subject: {
            include: { category: true },
          },
        },
      },
      subject: {
        include: { category: true },
      },
      user: true,
      reviewedBy: true,
    },
  });

  return purchase ? enrichPurchase(purchase) : null;
};

export const listPurchasesForUser = async (userId: string) => {
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: {
      lecture: {
        include: {
          subject: {
            include: { category: true },
          },
        },
      },
      subject: {
        include: { category: true },
      },
      reviewedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(purchases.map((purchase) => enrichPurchase(purchase)));
};

export const listAllPurchases = async () => {
  const purchases = await prisma.purchase.findMany({
    include: {
      lecture: {
        include: {
          subject: {
            include: { category: true },
          },
        },
      },
      subject: {
        include: { category: true },
      },
      user: true,
      reviewedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(purchases.map((purchase) => enrichPurchase(purchase)));
};

export const reviewPurchase = async (
  purchaseId: string,
  _reviewerId: string,
  payload: ReviewPurchaseInput,
) => {
  const purchase = await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      status: payload.status,
      adminNote: payload.adminNote,
      reviewedAt: new Date(),
    },
    include: {
      lecture: {
        include: {
          subject: {
            include: { category: true },
          },
        },
      },
      subject: {
        include: { category: true },
      },
      user: true,
      reviewedBy: true,
    },
  });

  return enrichPurchase(purchase);
};

export const hasApprovedSubjectAccess = async (
  userId: string,
  subjectId: string,
) => {
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId,
      status: {
        in: ["APPROVED", "COMPLETED"],
      },
      OR: [
        { subjectId },
        {
          lecture: {
            subjectId,
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(purchase);
};
