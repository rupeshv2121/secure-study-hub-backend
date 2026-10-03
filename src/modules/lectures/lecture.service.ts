import { prisma } from "../../lib/prisma";
import type { CreateLectureInput, UpdateLectureInput } from "./lecture.schema";

// Drafts (published: false) are only returned when includeDrafts is set, which
// callers must restrict to admins.
export const listLectures = async (subjectId?: string, includeDrafts = false) => {
  return prisma.lecture.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(includeDrafts ? {} : { published: true }),
    },
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

export const getLecture = async (id: string, includeDrafts = false) => {
  return prisma.lecture.findFirst({
    where: { id, ...(includeDrafts ? {} : { published: true }) },
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
