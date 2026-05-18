import type { Request, Response } from "express";
import { createSlideSchema } from "./slides.schema";
import * as service from "./slides.service";

export const listController = async (req: Request, res: Response) => {
  const lectureId = String(req.query.lectureId || req.params.lectureId);
  const data = await service.listSlidesForLecture(lectureId);
  res.json({ success: true, data });
};

export const createController = async (req: Request, res: Response) => {
  const payload = createSlideSchema.parse(req.body);
  const created = await service.createSlide(payload);
  res.status(201).json({ success: true, data: created });
};

export const deleteController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await service.deleteSlide(id);
  res.json({ success: true });
};
