const { PrismaClient } = require('@prisma/client');

(async () => {
    const p = new PrismaClient();
    try {
        const user = await p.user.update({
            where: { email: 'test+12345@example.com' },
            data: { role: 'ADMIN' }
        });
        console.log('Promoted user:', user.email);
    } catch (e) {
        console.error('Error promoting user:', e.message || e);
        process.exitCode = 1;
    } finally {
        await p.$disconnect();
    }
})();
