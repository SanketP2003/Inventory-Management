import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU must only contain alphanumeric characters, hyphens, and underscores'),
  quantity: z.number().int().min(0, 'Quantity must be greater than or equal to 0'),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, 'Low stock threshold must be greater than or equal to 0'),
  costPrice: z.number().positive('Cost price must be greater than 0'),
  supplierName: z.string().trim().min(1, 'Supplier name is required').max(200),
  reorderQuantity: z
    .number()
    .int()
    .positive('Reorder quantity must be greater than 0'),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name cannot be empty').max(200).optional(),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU must only contain alphanumeric characters, hyphens, and underscores')
    .optional(),
  quantity: z.number().int().min(0, 'Quantity must be >= 0').optional(),
  lowStockThreshold: z
    .number()
    .int()
    .min(0, 'Low stock threshold must be >= 0')
    .optional(),
  costPrice: z.number().positive('Cost price must be > 0').optional(),
  supplierName: z.string().trim().min(1, 'Supplier name cannot be empty').max(200).optional(),
  reorderQuantity: z.number().int().positive('Reorder quantity must be > 0').optional(),
});

export const updateStockSchema = z.object({
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity must be greater than or equal to 0'),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid Product ID format'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
