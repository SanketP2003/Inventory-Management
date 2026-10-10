import { Queue, JobsOptions } from 'bullmq';
import { redisClient } from './redis.js';
import { logger } from '../utils/logger.js';

export const REORDER_QUEUE_NAME = 'reorder-queue';

export interface ReorderJobData {
  reorderId: string;
  productId: string;
  quantityOrdered: number;
  supplierName: string;
}

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1500, // 1.5s, 3s, 6s
  },
  removeOnComplete: {
    age: 3600, // keep 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 86400, // keep 24 hours
  },
};

export const reorderQueue = new Queue<ReorderJobData>(REORDER_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions,
});

export const enqueueReorderJob = async (data: ReorderJobData): Promise<void> => {
  // Use reorderId as jobId to ensure idempotency in the queue
  await reorderQueue.add(`reorder-${data.reorderId}`, data, {
    jobId: data.reorderId,
  });
  logger.info(`Enqueued reorder job for reorder ID: ${data.reorderId}`);
};
