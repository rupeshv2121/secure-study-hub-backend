import type { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "./category.schema";
import * as service from "./category.service";

export const listController = async (_req: Request, res: Response) => {
  const data = await service.listCategories();
  res.json({ success: true, data });
};

export const getController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const item = await service.getCategory(id);
  res.json({ success: true, data: item });
};

export const createController = async (req: Request, res: Response) => {
  const payload = createCategorySchema.parse(req.body);
  const created = await service.createCategory(payload);
  res.status(201).json({ success: true, data: created });
};

export const updateController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const payload = updateCategorySchema.parse(req.body);
  const updated = await service.updateCategory(id, payload);
  res.json({ success: true, data: updated });
};

export const deleteController = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await service.deleteCategory(id);
  res.json({ success: true });
};
