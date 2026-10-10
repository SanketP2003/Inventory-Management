import { ReorderStatus } from '@prisma/client';
import { prisma } from '../repositories/prisma.js';
import { ReorderRepository, ReorderFindAllOptions } from '../repositories/reorder.repository.js';
import { OtpService } from './otp.service.js';
import { enqueueReorderJob } from '../queue/reorder.queue.js';
import { emitReorderUpdated } from '../sockets/socket.js';
import { publishReorderUpdate } from '../sockets/pubsub.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class ReorderService {
  public static async getReorders(options: ReorderFindAllOptions) {
    return ReorderRepository.findAll(options);
  }

  public static async getReorderById(id: string) {
    const reorder = await ReorderRepository.findById(id);
    if (!reorder) {
      throw new NotFoundError(`Reorder with ID '${id}' was not found.`);
    }
    return reorder;
  }

  /**
   * Approves a high-value reorder using OTP verification.
   * Locked after 5 failed attempts.
   */
  public static async approveReorder(id: string, otp: string) {
    const result = await prisma.$transaction(async (tx) => {
      const reorder = await ReorderRepository.findByIdForUpdate(id, tx);
      if (!reorder) {
        throw new NotFoundError(`Reorder with ID '${id}' was not found.`);
      }

      // Must be PENDING_APPROVAL
      if (reorder.status !== ReorderStatus.PENDING_APPROVAL) {
        throw new ConflictError(
          `Reorder cannot be approved because its current status is '${reorder.status}'. Only '${ReorderStatus.PENDING_APPROVAL}' reorders can be approved.`
        );
      }

      // Check if locked
      if (reorder.otpAttempts >= OtpService.MAX_OTP_ATTEMPTS) {
        throw new ConflictError(
          'Approval is locked: Maximum OTP verification attempts (5) exceeded. Please request a new OTP to unlock.',
          { code: 'OTP_LOCKED', attempts: reorder.otpAttempts }
        );
      }

      // Check if expired
      if (!reorder.otpExpiresAt || new Date() > reorder.otpExpiresAt) {
        throw new BadRequestError(
          'The approval OTP has expired. Please request a new OTP.',
          { code: 'OTP_EXPIRED' }
        );
      }

      // Verify OTP
      if (!reorder.otpHash) {
        throw new BadRequestError('No OTP was registered for this reorder.');
      }

      const isValid = await OtpService.verifyOtp(otp, reorder.otpHash);
      if (!isValid) {
        const nextAttempts = reorder.otpAttempts + 1;
        await ReorderRepository.update(
          id,
          { otpAttempts: nextAttempts },
          tx
        );

        if (nextAttempts >= OtpService.MAX_OTP_ATTEMPTS) {
          throw new ConflictError(
            'Invalid OTP. You have reached the maximum 5 attempts. Approval is now locked. Please request a new OTP.',
            { code: 'OTP_LOCKED', attempts: nextAttempts, remainingAttempts: 0 }
          );
        }

        const remainingAttempts = OtpService.MAX_OTP_ATTEMPTS - nextAttempts;
        throw new BadRequestError(
          `Invalid OTP. You have ${remainingAttempts} attempt(s) remaining.`,
          { code: 'OTP_INVALID', attempts: nextAttempts, remainingAttempts }
        );
      }

      // OTP is valid -> Transition to QUEUED
      const approvedAt = new Date();
      const updatedReorder = await ReorderRepository.update(
        id,
        {
          status: ReorderStatus.QUEUED,
          approvedAt,
          otpAttempts: 0,
        },
        tx
      );

      return updatedReorder;
    });

    logger.info(`Reorder ${id} approved successfully and transitioned to QUEUED.`);

    // Enqueue the job in BullMQ
    await enqueueReorderJob({
      reorderId: result.id,
      productId: result.productId,
      quantityOrdered: result.quantityOrdered,
      supplierName: result.supplierName,
    });

    const payload = {
      id: result.id,
      productId: result.productId,
      quantityOrdered: result.quantityOrdered,
      supplierName: result.supplierName,
      totalValue: Number(result.totalValue),
      status: result.status,
      attempts: result.attempts,
      failureReason: result.failureReason,
      approvedAt: result.approvedAt ? result.approvedAt.toISOString() : null,
      updatedAt: result.updatedAt.toISOString(),
    };

    emitReorderUpdated(payload);
    await publishReorderUpdate(payload);

    return result;
  }

  /**
   * Resends / regenerates an approval OTP for a pending reorder.
   */
  public static async resendOtp(id: string) {
    const rawOtp = OtpService.generateOtp();
    const otpHash = await OtpService.hashOtp(rawOtp);
    const otpExpiresAt = OtpService.getExpiryDate();

    const updated = await prisma.$transaction(async (tx) => {
      const reorder = await ReorderRepository.findByIdForUpdate(id, tx);
      if (!reorder) {
        throw new NotFoundError(`Reorder with ID '${id}' was not found.`);
      }

      if (reorder.status !== ReorderStatus.PENDING_APPROVAL) {
        throw new ConflictError(
          `Cannot resend OTP for reorder in '${reorder.status}' status. Only '${ReorderStatus.PENDING_APPROVAL}' reorders require OTP.`
        );
      }

      return ReorderRepository.update(
        id,
        {
          otpHash,
          otpExpiresAt,
          otpAttempts: 0, // Reset attempt counter on fresh resend
        },
        tx
      );
    });

    logger.warn('================================================================');
    logger.warn(`[SIMULATED SMS/EMAIL] RESENT APPROVAL OTP`);
    logger.warn(`Reorder ID: ${updated.id}`);
    logger.warn(`Generated OTP: >>> ${rawOtp} <<< (Valid for ${OtpService.OTP_EXPIRY_MINUTES} minutes)`);
    logger.warn('================================================================');

    const payload = {
      id: updated.id,
      productId: updated.productId,
      quantityOrdered: updated.quantityOrdered,
      supplierName: updated.supplierName,
      totalValue: Number(updated.totalValue),
      status: updated.status,
      attempts: updated.attempts,
      failureReason: updated.failureReason,
      approvedAt: updated.approvedAt ? updated.approvedAt.toISOString() : null,
      updatedAt: updated.updatedAt.toISOString(),
      ...(env.DEV_EXPOSE_OTP ? { otp: rawOtp } : {}),
    };

    emitReorderUpdated(payload);
    await publishReorderUpdate(payload);

    return {
      message: 'A new approval OTP has been generated and dispatched.',
      expiresAt: otpExpiresAt,
      ...(env.DEV_EXPOSE_OTP ? { devOtp: rawOtp } : {}),
    };
  }
}
