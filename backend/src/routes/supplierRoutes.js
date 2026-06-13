import { Router } from 'express';
import { supplierController } from '../controllers/supplierController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', supplierController.list);
router.get('/:id', supplierController.get);
router.post('/', requireAdmin, supplierController.create);
router.put('/:id', requireAdmin, supplierController.update);
router.delete('/:id', requireAdmin, supplierController.delete);

export default router;
