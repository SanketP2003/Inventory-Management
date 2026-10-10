import { Worker, Job } from 'bullmq';
import { ReorderStatus } from '@prisma/client';
import { prisma } from '../repositories/prisma.js';
import { ReorderRepository } from '../repositories/reorder.repository.js';
import { REORDER_QUEUE_NAME, ReorderJobData } from './reorder.queue.js';
import { createRedisClient } from './redis.js';
import { publishReorderUpdate } from '../sockets/pubsub.js';
import { logger } from '../utils/logger.js';

const workerRedis = createRedisClient('bullmq-worker-processor');

export const createReorderWorker = (): Worker<ReorderJobData> => {
  const worker = new Worker<ReorderJobData>(
    REORDER_QUEUE_NAME,
    async (job: Job<ReorderJobData>) => {
      const { reorderId, productId, quantityOrdered, supplierName } = job.data;
      const attemptNum = job.attemptsMade + 1;

      logger.info(
        `[Worker] Processing reorder job ${job.id} (Reorder ID: ${reorderId}) - Attempt ${attemptNum}/${job.opts.attempts || 3}`
      );

      // 1. Idempotency & state check
      const reorder = await ReorderRepository.findById(reorderId);
      if (!reorder) {
        logger.error(`[Worker] Reorder ${reorderId} not found in database. Aborting job.`);
        return;
      }

      if (reorder.status === ReorderStatus.COMPLETED) {
        logger.info(`[Worker] Reorder ${reorderId} is already COMPLETED. Idempotent skip.`);
        return;
      }

      if (reorder.status === ReorderStatus.FAILED && attemptNum === 1) {
        logger.info(`[Worker] Reorder ${reorderId} is already marked as FAILED. Skipping.`);
        return;
      }

      // 2. Set status to PROCESSING
      const updatedProcessing = await ReorderRepository.update(reorderId, {
        status: ReorderStatus.PROCESSING,
        attempts: attemptNum,
      });

      const processingPayload = {
        id: updatedProcessing.id,
        productId: updatedProcessing.productId,
        productName: reorder.product?.name,
        sku: reorder.product?.sku,
        quantityOrdered: updatedProcessing.quantityOrdered,
        supplierName: updatedProcessing.supplierName,
        totalValue: Number(updatedProcessing.totalValue),
        status: updatedProcessing.status,
        attempts: updatedProcessing.attempts,
        failureReason: updatedProcessing.failureReason,
        approvedAt: updatedProcessing.approvedAt ? updatedProcessing.approvedAt.toISOString() : null,
        updatedAt: updatedProcessing.updatedAt.toISOString(),
      };

      // Broadcast PROCESSING state change over Redis Pub/Sub
      await publishReorderUpdate(processingPayload);

      // 3. Simulate supplier API call (random 1–3s delay)
      const simulatedDelayMs = Math.floor(Math.random() * 2000) + 1000;
      logger.info(
        `[Worker] Calling supplier API for ${supplierName}... (Simulated latency: ${simulatedDelayMs}ms)`
      );
      await new Promise((resolve) => setTimeout(resolve, simulatedDelayMs));

      // 4. Simulate ~20% failure probability
      const simulatedFailureRate = 0.20;
      const randomRoll = Math.random();
      if (randomRoll < simulatedFailureRate) {
        const errorReason = `Supplier API simulation failure (Roll: ${(randomRoll * 100).toFixed(1)}% < 20%): HTTP 503 Service Unavailable from ${supplierName}`;
        logger.warn(`[Worker] Supplier call failed on attempt ${attemptNum}: ${errorReason}`);
        throw new Error(errorReason);
      }

      // 5. Success: update reorder to COMPLETED and replenish inventory stock
      await prisma.$transaction(async (tx) => {
        await tx.reorder.update({
          where: { id: reorderId },
          data: {
            status: ReorderStatus.COMPLETED,
            failureReason: null,
          },
        });

        // Automatically replenish the inventory stock
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: {
              increment: quantityOrdered,
            },
          },
        });
      });

      const completedReorder = await ReorderRepository.findById(reorderId);
      logger.info(
        `[Worker] Reorder ${reorderId} successfully completed! Replenished ${quantityOrdered} units to product ${productId}.`
      );

      if (completedReorder) {
        const completedPayload = {
          id: completedReorder.id,
          productId: completedReorder.productId,
          productName: completedReorder.product?.name,
          sku: completedReorder.product?.sku,
          quantityOrdered: completedReorder.quantityOrdered,
          supplierName: completedReorder.supplierName,
          totalValue: Number(completedReorder.totalValue),
          status: completedReorder.status,
          attempts: completedReorder.attempts,
          failureReason: null,
          approvedAt: completedReorder.approvedAt ? completedReorder.approvedAt.toISOString() : null,
          updatedAt: completedReorder.updatedAt.toISOString(),
        };

        // Broadcast COMPLETED state change
        await publishReorderUpdate(completedPayload);
      }
    },
    {
      connection: workerRedis,
      concurrency: 5,
    }
  );

  // BullMQ Failed Event Handler (manages retries and final failure)
  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { reorderId } = job.data;
    const maxAttempts = job.opts.attempts || 3;
    const attemptsMade = job.attemptsMade;

    logger.warn(
      `[Worker Event] Job ${job.id} for reorder ${reorderId} failed attempt ${attemptsMade}/${maxAttempts}. Reason: ${err.message}`
    );

    // If final attempt failed, update DB to FAILED
    if (attemptsMade >= maxAttempts) {
      logger.error(
        `[Worker Event] Reorder ${reorderId} permanently failed after ${attemptsMade} attempts. Setting status to FAILED.`
      );

      try {
        const failedReorder = await ReorderRepository.update(reorderId, {
          status: ReorderStatus.FAILED,
          failureReason: `Exceeded max retry attempts (${maxAttempts}). Last error: ${err.message}`,
        });

        const failedPayload = {
          id: failedReorder.id,
          productId: failedReorder.productId,
          quantityOrdered: failedReorder.quantityOrdered,
          supplierName: failedReorder.supplierName,
          totalValue: Number(failedReorder.totalValue),
          status: failedReorder.status,
          attempts: failedReorder.attempts,
          failureReason: failedReorder.failureReason,
          approvedAt: failedReorder.approvedAt ? failedReorder.approvedAt.toISOString() : null,
          updatedAt: failedReorder.updatedAt.toISOString(),
        };

        await publishReorderUpdate(failedPayload);
      } catch (dbErr) {
        logger.error(`[Worker Event] Failed to update reorder ${reorderId} status to FAILED:`, dbErr);
      }
    }
  });

  worker.on('error', (err) => {
    logger.error('[Worker Event] BullMQ Worker error:', err);
  });

  return worker;
};
