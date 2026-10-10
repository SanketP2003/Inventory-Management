import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initSocketServer } from './sockets/socket.js';
import { prisma } from './repositories/prisma.js';
import { redisClient } from './queue/redis.js';
import { closePubSub } from './sockets/pubsub.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO and Redis pub/sub relay
initSocketServer(server);

const serverInstance = server.listen(env.PORT, () => {
  logger.info(`====================================================`);
  logger.info(`🚀 API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`📡 Socket.IO initialized with CORS allowed origin: ${env.CORS_ORIGIN}`);
  logger.info(`⚙️  Approval limit set to $${env.REORDER_APPROVAL_LIMIT}`);
  logger.info(`🛠️  DEV_EXPOSE_OTP: ${env.DEV_EXPOSE_OTP}`);
  logger.info(`====================================================`);
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down API server gracefully...`);

  serverInstance.close(async () => {
    logger.info('HTTP and Socket server closed.');
    try {
      await closePubSub();
      await redisClient.quit();
      await prisma.$disconnect();
      logger.info('Database and Redis connections closed. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
