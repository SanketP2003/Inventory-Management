import { Router } from 'express';
import productRoutes from './product.routes.js';
import reorderRoutes from './reorder.routes.js';
import healthRoutes from './health.routes.js';

const apiRouter = Router();

apiRouter.use('/products', productRoutes);
apiRouter.use('/reorders', reorderRoutes);
apiRouter.use('/health', healthRoutes);

export default apiRouter;
