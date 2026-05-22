import type { Request, Response } from "express";
import * as purchaseService from "../purchases/purchase.service";
import { createSlideSchema } from "./slides.schema";
import * as service from "./slides.service";

export const listController = async (req: Request, res: Response) => {
  const lectureId = String(req.query.lectureId || req.params.lectureId);
  const lecture = await service.getLectureForAccessCheck(lectureId);

  if (!lecture) {
    res.status(404).json({ success: false, message: "Lecture not found" });
    return;
  }

  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (user.role !== "ADMIN") {
    const subjectId = lecture.subjectId;
    const allowed = subjectId
      ? await purchaseService.hasApprovedSubjectAccess(user.id, subjectId)
      : false;
    const isFreeLecture = (lecture.price ?? 0) === 0;

    if (!allowed && !isFreeLecture) {
      res
        .status(403)
        .json({ success: false, message: "Purchase approval required" });
      return;
    }
  }

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
