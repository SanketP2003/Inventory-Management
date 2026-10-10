import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
export const reorderQueue = new Queue('inventory-reorders', { connection: redis });
export async function queueReorder(productId: string) {
  await reorderQueue.add('create-reorder', { productId }, { jobId: `low-stock-${productId}`, removeOnComplete: 100, removeOnFail: 100 });
}
