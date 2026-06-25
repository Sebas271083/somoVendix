import { Router } from 'express';
import { installmentController } from '../controllers/installmentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);
router.get('/plans', installmentController.list);
router.get('/plans/:plan_id', installmentController.getInstallments);
router.patch('/:id/pay', installmentController.markPaid);

export default router;
