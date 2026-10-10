import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a standalone ioredis connection with BullMQ-compatible options.
 */
export const createRedisClient = (name = 'redis'): Redis => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  client.on('connect', () => {
    logger.info(`Redis [${name}] connected successfully.`);
  });

  client.on('error', (err) => {
    logger.error(`Redis [${name}] error:`, err);
  });

  return client;
};

// Default singleton client for queue and general ops
export const redisClient = createRedisClient('main');
