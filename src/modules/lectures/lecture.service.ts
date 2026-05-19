import { prisma } from "../../lib/prisma";
import type { CreateLectureInput, UpdateLectureInput } from "./lecture.schema";

export const listLectures = async (subjectId?: string) => {
  const where = subjectId ? { where: { subjectId } } : {};
  return prisma.lecture.findMany({
    ...(where as object),
    include: {
      subject: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });
};

export const getLecture = async (id: string) => {
  return prisma.lecture.findUnique({
    where: { id },
    include: {
      subject: {
        include: {
          category: true,
        },
      },
    },
  });
};

export const createLecture = async (payload: CreateLectureInput) => {
  return prisma.lecture.create({ data: payload });
};

export const updateLecture = async (
  id: string,
  payload: UpdateLectureInput,
) => {
  return prisma.lecture.update({ where: { id }, data: payload });
};

export const deleteLecture = async (id: string) => {
  return prisma.lecture.delete({ where: { id } });
};
