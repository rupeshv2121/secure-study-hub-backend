import type { Request, Response } from "express";
import * as service from "./viewLogs.service";

export const createController = async (req: Request, res: Response) => {
  const { lectureId } = req.body as { lectureId: string };
  const userId = (req.user as any)?.id;
  if (!lectureId || !userId) {
    res
      .status(400)
      .json({
        success: false,
        message: "lectureId and authenticated user required",
      });
    return;
  }

  const created = await service.createViewLog(lectureId, userId);
  res.status(201).json({ success: true, data: created });
};
