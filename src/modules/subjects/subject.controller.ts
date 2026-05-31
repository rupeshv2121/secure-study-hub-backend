import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import { createSubjectSchema, updateSubjectSchema } from "./subject.schema";
import * as service from "./subject.service";

export const listController = async (req: Request, res: Response) => {
  const includeInactive =
    req.query.includeInactive === "true" && req.user?.role === "ADMIN";
  const data = await service.listSubjects(includeInactive);
  res.json({ success: true, data });
};

export const getController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await service.getSubject(id);
  res.json({ success: true, data: item });
};

export const createController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Not authenticated", 401);
  if (req.user.role !== "ADMIN")
    throw new AppError("Admin privileges required", 403);
  const payload = createSubjectSchema.parse(req.body);
  const created = await service.createSubject(payload);
  res.status(201).json({ success: true, data: created });
};

export const updateController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Not authenticated", 401);
  if (req.user.role !== "ADMIN")
    throw new AppError("Admin privileges required", 403);
  const id = String(req.params.id);
  const payload = updateSubjectSchema.parse(req.body);
  const updated = await service.updateSubject(id, payload);
  res.json({ success: true, data: updated });
};

export const deleteController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Not authenticated", 401);
  if (req.user.role !== "ADMIN")
    throw new AppError("Admin privileges required", 403);
  const id = String(req.params.id);
  await service.deleteSubject(id);
  res.json({ success: true });
};
