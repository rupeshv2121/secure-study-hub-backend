import { z } from "zod";

export const createLectureSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  contentUrl: z.string().url().optional(),
  price: z.number().nonnegative().optional(),
  published: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const updateLectureSchema = createLectureSchema.partial();

export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type UpdateLectureInput = z.infer<typeof updateLectureSchema>;
