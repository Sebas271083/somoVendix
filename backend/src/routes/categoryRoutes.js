import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', categoryController.list);
router.post('/', requireAdmin, categoryController.create);
router.put('/:id', requireAdmin, categoryController.update);
router.delete('/:id', requireAdmin, categoryController.delete);

export default router;
