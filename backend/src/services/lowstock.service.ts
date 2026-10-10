import { Prisma, Product, Reorder, ReorderStatus } from '@prisma/client';
import { prisma } from '../repositories/prisma.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { ReorderRepository } from '../repositories/reorder.repository.js';
import { OtpService } from './otp.service.js';
import { enqueueReorderJob } from '../queue/reorder.queue.js';
import { emitLowStockEvent, emitReorderUpdated } from '../sockets/socket.js';
import { publishReorderUpdate } from '../sockets/pubsub.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface LowStockCheckResult {
  isLowStock: boolean;
  reorderCreated: boolean;
  reorder?: Reorder;
  rawOtp?: string;
}

export class LowStockService {
  /**
   * Evaluates product stock levels and triggers automated reordering if needed.
   * Runs within a transactional boundary with pessimistic row locking to prevent duplicates.
   */
  public static async checkAndTriggerReorder(
    productId: string,
    existingTx?: Prisma.TransactionClient
  ): Promise<LowStockCheckResult> {
    const executeInTransaction = async (tx: Prisma.TransactionClient): Promise<LowStockCheckResult> => {
      // 1. Lock the product row with SELECT ... FOR UPDATE
      const product = await ProductRepository.findByIdForUpdate(productId, tx);
      if (!product) {
        return { isLowStock: false, reorderCreated: false };
      }

      // Check if stock is strictly lower than lowStockThreshold
      const isLowStock = product.quantity < product.lowStockThreshold;
      if (!isLowStock) {
        return { isLowStock: false, reorderCreated: false };
      }

      // 2. Guard against duplicate active reorders (PENDING_APPROVAL, QUEUED, PROCESSING)
      const existingActiveReorder = await ReorderRepository.findActiveReorderForProduct(product.id, tx);
      if (existingActiveReorder) {
        logger.info(
          `Product ${product.sku} is low stock (${product.quantity} < ${product.lowStockThreshold}), but an active reorder already exists (ID: ${existingActiveReorder.id}, Status: ${existingActiveReorder.status}). Skipping duplicate creation.`
        );
        return { isLowStock: true, reorderCreated: false, reorder: existingActiveReorder };
      }

      // 3. Emit real-time Socket.IO low-stock alert to connected clients
      emitLowStockEvent({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
        reorderQuantity: product.reorderQuantity,
        timestamp: new Date().toISOString(),
      });

      // 4. Calculate total value: quantityOrdered * costPrice
      const quantityOrdered = product.reorderQuantity;
      const costPriceNum = Number(product.costPrice);
      const totalValueNum = Number((quantityOrdered * costPriceNum).toFixed(2));
      const totalValue = new Prisma.Decimal(totalValueNum);

      const requiresApproval = totalValueNum > env.REORDER_APPROVAL_LIMIT;

      let rawOtp: string | undefined;
      let otpHash: string | null = null;
      let otpExpiresAt: Date | null = null;
      let status: ReorderStatus = ReorderStatus.QUEUED;

      if (requiresApproval) {
        status = ReorderStatus.PENDING_APPROVAL;
        rawOtp = OtpService.generateOtp();
        otpHash = await OtpService.hashOtp(rawOtp);
        otpExpiresAt = OtpService.getExpiryDate();

        logger.warn('================================================================');
        logger.warn(`[SIMULATED SMS/EMAIL] HIGH-VALUE REORDER APPROVAL REQUIRED`);
        logger.warn(`Product: ${product.name} (SKU: ${product.sku})`);
        logger.warn(`Quantity: ${quantityOrdered} | Total Value: $${totalValueNum.toFixed(2)} (Limit: $${env.REORDER_APPROVAL_LIMIT})`);
        logger.warn(`Generated OTP: >>> ${rawOtp} <<< (Valid for ${OtpService.OTP_EXPIRY_MINUTES} minutes)`);
        logger.warn('================================================================');
      }

      // 5. Create Reorder record
      const reorder = await ReorderRepository.create(
        {
          productId: product.id,
          quantityOrdered,
          supplierName: product.supplierName,
          totalValue,
          status,
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
        },
        tx
      );

      logger.info(
        `Created reorder ${reorder.id} for product ${product.sku} with status ${status} (Total Value: $${totalValueNum})`
      );

      return {
        isLowStock: true,
        reorderCreated: true,
        reorder,
        rawOtp,
      };
    };

    // If an existing transaction is passed, use it; otherwise start a new one
    const result = existingTx
      ? await executeInTransaction(existingTx)
      : await prisma.$transaction(executeInTransaction, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });

    // Post-transaction actions: Enqueue job or broadcast updates
    if (result.reorderCreated && result.reorder) {
      const reorderPayload = {
        id: result.reorder.id,
        productId: result.reorder.productId,
        quantityOrdered: result.reorder.quantityOrdered,
        supplierName: result.reorder.supplierName,
        totalValue: Number(result.reorder.totalValue),
        status: result.reorder.status,
        attempts: result.reorder.attempts,
        failureReason: result.reorder.failureReason,
        approvedAt: result.reorder.approvedAt ? result.reorder.approvedAt.toISOString() : null,
        updatedAt: result.reorder.updatedAt.toISOString(),
        ...(env.DEV_EXPOSE_OTP && result.rawOtp ? { otp: result.rawOtp } : {}),
      };

      // Emit to direct local sockets
      emitReorderUpdated(reorderPayload);

      // Publish to Redis for any cross-process listeners
      await publishReorderUpdate(reorderPayload);

      // If approved or auto-queued (below approval limit), enqueue to BullMQ
      if (result.reorder.status === ReorderStatus.QUEUED) {
        await enqueueReorderJob({
          reorderId: result.reorder.id,
          productId: result.reorder.productId,
          quantityOrdered: result.reorder.quantityOrdered,
          supplierName: result.reorder.supplierName,
        });
      }
    }

    return result;
  }
}
