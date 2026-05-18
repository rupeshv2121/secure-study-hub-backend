import { prisma } from "../../lib/prisma";

export const createViewLog = async (lectureId: string, userId: string) => {
  const created = await prisma.viewLog.create({ data: { lectureId, userId } });

  // Increment lecture viewCount
  await prisma.lecture.update({
    where: { id: lectureId },
    data: { viewCount: { increment: 1 } as any },
  });

  return created;
};
