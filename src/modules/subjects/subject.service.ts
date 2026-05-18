import { prisma } from "../../lib/prisma";
import type { CreateSubjectInput, UpdateSubjectInput } from "./subject.schema";

export const listSubjects = async () => {
  return prisma.subject.findMany({ include: { lectures: true } });
};

export const getSubject = async (id: string) => {
  return prisma.subject.findUnique({
    where: { id },
    include: { lectures: true },
  });
};

export const createSubject = async (payload: CreateSubjectInput) => {
  return prisma.subject.create({ data: payload });
};

export const updateSubject = async (
  id: string,
  payload: UpdateSubjectInput,
) => {
  return prisma.subject.update({ where: { id }, data: payload });
};

export const deleteSubject = async (id: string) => {
  return prisma.subject.delete({ where: { id } });
};
