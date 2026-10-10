import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
});

prisma.$connect().then(() => {
  logger.info('Connected to PostgreSQL via Prisma');
}).catch((err) => {
  logger.error('Failed to connect to PostgreSQL via Prisma', err);
});
