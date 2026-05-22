import { z } from "zod";

export const createPurchaseSchema = z.object({
  subjectId: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  currency: z.string().min(1).default("INR"),
  note: z.string().max(500).optional(),
});

export const reviewPurchaseSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().max(1000).optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type ReviewPurchaseInput = z.infer<typeof reviewPurchaseSchema>;
