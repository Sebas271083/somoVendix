import { Router } from 'express';
import { purchaseOrderController } from '../controllers/purchaseOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', purchaseOrderController.list);
router.get('/:id', purchaseOrderController.get);
router.post('/', purchaseOrderController.create);
router.patch('/:id/receive', purchaseOrderController.receive);
router.patch('/:id/cancel', purchaseOrderController.cancel);

export default router;
