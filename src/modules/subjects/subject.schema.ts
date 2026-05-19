import { z } from "zod";

export const createSubjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
