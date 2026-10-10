import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health
router.get('/', HealthController.check);

export default router;
