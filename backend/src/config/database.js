import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const prisma = globalThis.prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function testDatabaseConnection() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export default prisma;
