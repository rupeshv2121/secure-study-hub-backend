import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import { createFeedbackSchema } from "./feedback.schema";
import * as service from "./feedback.service";

export const createController = async (req: Request, res: Response) => {
  const payload = createFeedbackSchema.parse(req.body);
  const userId = (req.user as { id?: string } | undefined)?.id;
  const created = await service.createFeedback(payload, userId);
  res.status(201).json({ success: true, data: created });
};

export const listPublicController = async (_req: Request, res: Response) => {
  const items = await service.listPublicFeedbacks(10);
  res.json({ success: true, data: items });
};

export const listAllController = async (_req: Request, res: Response) => {
  const items = await service.listAllFeedbacks();
  res.json({ success: true, data: items });
};

export const approveController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { approved } = req.body as { approved?: boolean };
  if (approved === undefined) throw new AppError("approved required", 400);
  const updated = await service.approveFeedback(id, Boolean(approved));
  res.json({ success: true, data: updated });
};
