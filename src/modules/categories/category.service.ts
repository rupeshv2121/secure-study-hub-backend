import { prisma } from "../../lib/prisma";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schema";

export const listCategories = async () => {
  return prisma.category.findMany();
};

export const getCategory = async (id: string) => {
  return prisma.category.findUnique({ where: { id } });
};

export const createCategory = async (payload: CreateCategoryInput) => {
  return prisma.category.create({ data: payload });
};

export const updateCategory = async (
  id: string,
  payload: UpdateCategoryInput,
) => {
  return prisma.category.update({ where: { id }, data: payload });
};

export const deleteCategory = async (id: string) => {
  return prisma.category.delete({ where: { id } });
};
