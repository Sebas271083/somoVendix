import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { checkProductLimit } from '../middleware/planLimitsMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', productController.list);
router.get('/low-stock', productController.lowStock);
router.get('/code/:code', productController.getByCode);
router.get('/:id', productController.get);
router.get('/:id/stock-history', productController.stockHistory);
router.post('/', requireAdmin, checkProductLimit, productController.create);
router.put('/:id', requireAdmin, productController.update);
router.patch('/:id/stock', requireAdmin, productController.adjustStock);

export default router;
