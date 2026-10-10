import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle Prisma Known Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      res.status(409).json({
        error: {
          code: 'DUPLICATE_ENTITY',
          message: `A record with this ${target.join(', ') || 'field'} already exists.`,
          details: { target },
        },
      });
      return;
    }

    // P2025: Record to delete or update not found
    if (err.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record does not exist or has been deleted.',
        },
      });
      return;
    }

    // P2003: Foreign key constraint failed
    if (err.code === 'P2003') {
      res.status(409).json({
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'The operation violates a foreign key constraint.',
        },
      });
      return;
    }
  }

  // Generic internal server error
  logger.error('Unhandled internal server error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
  });
};
