import type { Request, Response } from "express";
import { createPurchaseSchema } from "./purchase.schema";
import * as service from "./purchase.service";

export const createController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.user!.id;
  const payload = createPurchaseSchema.parse(req.body);
  const created = await service.createPurchase(userId, payload);
  res.status(201).json({ success: true, data: created });
};

export const getController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const id = String(req.params.id);
  const purchase = await service.getPurchase(id);
  if (!purchase) {
    res.status(404).json({ success: false, message: "Not found" });
    return;
  }
  // allow owner or admin to view
  if (req.user!.role !== "ADMIN" && purchase.userId !== req.user!.id) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  res.json({ success: true, data: purchase });
};

export const listController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (req.user!.role === "ADMIN") {
    const data = await service.listAllPurchases();
    res.json({ success: true, data });
    return;
  }
  const data = await service.listPurchasesForUser(req.user!.id);
  res.json({ success: true, data });
};
