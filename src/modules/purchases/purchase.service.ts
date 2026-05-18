import { prisma } from "../../lib/prisma";
import type { CreatePurchaseInput } from "./purchase.schema";

export const createPurchase = async (
  userId: string,
  payload: CreatePurchaseInput,
) => {
  // In a real app you'd call a payment provider here and set status accordingly
  return prisma.purchase.create({
    data: {
      userId,
      lectureId: payload.lectureId,
      amount: payload.amount,
      currency: payload.currency,
      metadata: payload.metadata,
    },
  });
};

export const getPurchase = async (id: string) => {
  return prisma.purchase.findUnique({
    where: { id },
    include: { lecture: true, user: true },
  });
};

export const listPurchasesForUser = async (userId: string) => {
  return prisma.purchase.findMany({
    where: { userId },
    include: { lecture: true },
  });
};

export const listAllPurchases = async () => {
  return prisma.purchase.findMany({ include: { lecture: true, user: true } });
};
