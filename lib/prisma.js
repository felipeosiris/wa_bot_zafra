// Wrapper para Prisma Client
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Manejar desconexión graceful
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
