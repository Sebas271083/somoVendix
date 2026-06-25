import { Router } from 'express';
import { stocktakeController } from '../controllers/stocktakeController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', stocktakeController.list);
router.get('/:id', stocktakeController.get);
router.patch('/:id/items/:itemId', stocktakeController.updateItem);
router.post('/:id/close', requireAdmin, stocktakeController.close);
router.post('/', requireAdmin, stocktakeController.create);

export default router;
