import { z } from 'zod';

export const reorderStatusEnum = z.enum([
  'PENDING_APPROVAL',
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const getReordersQuerySchema = z.object({
  status: reorderStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const reorderIdParamSchema = z.object({
  id: z.string().uuid('Invalid Reorder ID format'),
});

export const approveReorderSchema = z.object({
  otp: z
    .string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric digits only'),
});

export type GetReordersQuery = z.infer<typeof getReordersQuerySchema>;
export type ApproveReorderInput = z.infer<typeof approveReorderSchema>;
