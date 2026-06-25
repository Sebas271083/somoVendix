import { Router } from 'express';
import { quoteController } from '../controllers/quoteController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);
router.get('/', quoteController.list);
router.get('/:id', quoteController.get);
router.post('/', quoteController.create);
router.put('/:id', quoteController.update);
router.delete('/:id', requireAdmin, quoteController.remove);

export default router;
