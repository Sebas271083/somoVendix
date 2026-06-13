import { Router } from 'express';
import { saleController } from '../controllers/saleController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { checkSaleLimit } from '../middleware/planLimitsMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', saleController.list);
router.get('/summary', saleController.dailySummary);
router.get('/:id', saleController.get);
router.post('/', checkSaleLimit, saleController.create);
router.patch('/:id/cancel', requireAdmin, saleController.cancel);

export default router;
