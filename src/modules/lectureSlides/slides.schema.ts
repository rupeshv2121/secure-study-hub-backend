import { z } from "zod";

export const createSlideSchema = z.object({
  lectureId: z.string().min(1),
  slideNumber: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
});

export type CreateSlideInput = z.infer<typeof createSlideSchema>;
