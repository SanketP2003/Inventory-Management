import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z, ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}
export const validate = (schema: z.ZodType): RequestHandler => (req, _res, next) => {
  try { req.body = schema.parse(req.body); next(); } catch (error) { next(error); }
};
export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'Route not found'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: error.flatten() });
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) console.error(error);
  return res.status(status).json({ error: error instanceof Error ? error.message : 'Internal server error', ...(error instanceof HttpError && error.details ? { details: error.details } : {}) });
};
