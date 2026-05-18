import type { Request, Response } from "express";
import { createSubjectSchema, updateSubjectSchema } from "./subject.schema";
import * as service from "./subject.service";

export const listController = async (req: Request, res: Response) => {
  const data = await service.listSubjects();
  res.json({ success: true, data });
};

export const getController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await service.getSubject(id);
  res.json({ success: true, data: item });
};

export const createController = async (req: Request, res: Response) => {
  const payload = createSubjectSchema.parse(req.body);
  const created = await service.createSubject(payload);
  res.status(201).json({ success: true, data: created });
};

export const updateController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const payload = updateSubjectSchema.parse(req.body);
  const updated = await service.updateSubject(id, payload);
  res.json({ success: true, data: updated });
};

export const deleteController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await service.deleteSubject(id);
  res.json({ success: true });
};
