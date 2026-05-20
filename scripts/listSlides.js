const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        const rows = await prisma.lectureSlide.findMany({ select: { id: true, storagePath: true } });
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('Query error', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
