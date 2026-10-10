import { createReorderWorker } from './queue/reorder.worker.js';
import { prisma } from './repositories/prisma.js';
import { logger } from './utils/logger.js';
import { closePubSub } from './sockets/pubsub.js';

logger.info('====================================================');
logger.info('⚙️  Starting BullMQ Reorder Worker process...');
logger.info('====================================================');

const worker = createReorderWorker();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down worker gracefully...`);
  try {
    await worker.close();
    logger.info('BullMQ worker closed.');
    await closePubSub();
    await prisma.$disconnect();
    logger.info('Worker resources released. Exiting.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during worker shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

logger.info('🚀 Worker is active and listening for reorder jobs.');
