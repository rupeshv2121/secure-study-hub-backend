import { z } from "zod";

export const createPurchaseSchema = z.object({
  lectureId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: z.string().default("USD"),
  metadata: z.any().optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
