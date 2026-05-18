import type { Request, Response } from "express";
import { createLectureSchema, updateLectureSchema } from "./lecture.schema";
import * as service from "./lecture.service";

export const listController = async (req: Request, res: Response) => {
  const subjectId = req.query.subjectId as string | undefined;
  const data = await service.listLectures(subjectId);
  res.json({ success: true, data });
};

export const getController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await service.getLecture(id);
  res.json({ success: true, data: item });
};

export const createController = async (req: Request, res: Response) => {
  const payload = createLectureSchema.parse(req.body);
  const created = await service.createLecture(payload);
  res.status(201).json({ success: true, data: created });
};

export const updateController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const payload = updateLectureSchema.parse(req.body);
  const updated = await service.updateLecture(id, payload);
  res.json({ success: true, data: updated });
};

export const deleteController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await service.deleteLecture(id);
  res.json({ success: true });
};
