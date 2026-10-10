import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productIdParamSchema,
} from '../validators/product.validator.js';

const router = Router();

// GET /api/products
router.get('/', ProductController.getAll);

// POST /api/products
router.post(
  '/',
  validateRequest({ body: createProductSchema }),
  ProductController.create
);

// GET /api/products/:id
router.get(
  '/:id',
  validateRequest({ params: productIdParamSchema }),
  ProductController.getById
);

// PUT /api/products/:id
router.put(
  '/:id',
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  ProductController.update
);

// PATCH /api/products/:id/stock
router.patch(
  '/:id/stock',
  validateRequest({ params: productIdParamSchema, body: updateStockSchema }),
  ProductController.updateStock
);

// DELETE /api/products/:id
router.delete(
  '/:id',
  validateRequest({ params: productIdParamSchema }),
  ProductController.delete
);

export default router;
