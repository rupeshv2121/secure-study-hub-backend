import { z } from "zod";

export const createFeedbackSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  rating: z.coerce.number().min(1).max(5),
  message: z.string().min(5).max(2000),
  subjectId: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
