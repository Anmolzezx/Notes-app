import { PrismaClient } from '@prisma/client';
import { config } from './config';

export const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, closing database connections...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
