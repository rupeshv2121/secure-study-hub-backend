import { prisma } from "../../lib/prisma";
import type { CreateSlideInput } from "./slides.schema";

export const listSlidesForLecture = async (lectureId: string) => {
  return prisma.lectureSlide.findMany({
    where: { lectureId },
    orderBy: { slideNumber: "asc" },
  });
};

export const getLectureForAccessCheck = async (lectureId: string) => {
  return prisma.lecture.findUnique({
    where: { id: lectureId },
    select: {
      id: true,
      subjectId: true,
      price: true,
      subject: { select: { price: true } },
    },
  });
};

export const createSlide = async (payload: CreateSlideInput) => {
  return prisma.lectureSlide.create({
    data: {
      lectureId: payload.lectureId,
      slideNumber: payload.slideNumber,
      storagePath: payload.storagePath,
    },
  });
};

export const deleteSlide = async (id: string) => {
  return prisma.lectureSlide.delete({ where: { id } });
};
