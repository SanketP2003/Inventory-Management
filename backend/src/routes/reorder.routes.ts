import { Router } from 'express';
import { ReorderController } from '../controllers/reorder.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  getReordersQuerySchema,
  reorderIdParamSchema,
  approveReorderSchema,
} from '../validators/reorder.validator.js';

const router = Router();

// GET /api/reorders (filter by status, paginate)
router.get(
  '/',
  validateRequest({ query: getReordersQuerySchema }),
  ReorderController.getAll
);

// GET /api/reorders/:id (includes product details)
router.get(
  '/:id',
  validateRequest({ params: reorderIdParamSchema }),
  ReorderController.getById
);

// POST /api/reorders/:id/approve
router.post(
  '/:id/approve',
  validateRequest({
    params: reorderIdParamSchema,
    body: approveReorderSchema,
  }),
  ReorderController.approve
);

// POST /api/reorders/:id/otp/resend
router.post(
  '/:id/otp/resend',
  validateRequest({ params: reorderIdParamSchema }),
  ReorderController.resendOtp
);

export default router;
