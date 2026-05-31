import { prisma } from "../../lib/prisma";
import type { CreateSubjectInput, UpdateSubjectInput } from "./subject.schema";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const createUniqueSlug = async (title: string, excludeId?: string) => {
  const baseSlug = slugify(title) || "subject";
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = excludeId
      ? await prisma.subject.findFirst({
          where: {
            slug,
            NOT: { id: excludeId },
          },
        })
      : await prisma.subject.findUnique({ where: { slug } });

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

export const listSubjects = async (includeInactive = false) => {
  return prisma.subject.findMany({
    where: includeInactive ? undefined : { isActive: true },
    include: { lectures: true, category: true },
  });
};

export const getSubject = async (id: string) => {
  return prisma.subject.findUnique({
    where: { id },
    include: { lectures: true },
  });
};

export const createSubject = async (payload: CreateSubjectInput) => {
  const slug = await createUniqueSlug(payload.title);

  return prisma.subject.create({
    data: {
      title: payload.title,
      slug,
      description: payload.description,
      price: payload.price,
      categoryId: payload.categoryId,
      isActive: payload.isActive,
    },
  });
};

export const updateSubject = async (
  id: string,
  payload: UpdateSubjectInput,
) => {
  const data: UpdateSubjectInput & { slug?: string } = { ...payload };

  if (typeof payload.title === "string" && payload.title.trim().length > 0) {
    data.slug = await createUniqueSlug(payload.title, id);
  }

  return prisma.subject.update({ where: { id }, data });
};

export const deleteSubject = async (id: string) => {
  return prisma.subject.delete({ where: { id } });
};
