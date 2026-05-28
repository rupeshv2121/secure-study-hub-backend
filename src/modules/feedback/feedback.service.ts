import { prisma } from "../../lib/prisma";
import type { CreateFeedbackInput } from "./feedback.schema";

export const createFeedback = async (
  payload: CreateFeedbackInput,
  userId?: string,
) => {
  const created = await prisma.feedback.create({
    data: {
      userId: userId || undefined,
      name: payload.name,
      email: payload.email,
      rating: Number(payload.rating),
      message: payload.message,
      subjectId: payload.subjectId || undefined,
      isPublic: payload.isPublic ?? true,
      approved: false,
    },
  });

  return created;
};

export const listPublicFeedbacks = async (take = 10) => {
  const items = await prisma.feedback.findMany({
    where: { isPublic: true, approved: true },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      rating: true,
      message: true,
      createdAt: true,
    },
  });

  return items;
};

export const listAllFeedbacks = async () => {
  return prisma.feedback.findMany({ orderBy: { createdAt: "desc" } });
};

export const approveFeedback = async (id: string, approved = true) => {
  return prisma.feedback.update({ where: { id }, data: { approved } });
};
