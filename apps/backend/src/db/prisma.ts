import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const logLevels: Array<'info' | 'query' | 'warn' | 'error'> = ['error'];

if (process.env.NODE_ENV === 'development') {
  logLevels.push('warn', 'info', 'query');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
