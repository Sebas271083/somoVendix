import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', customerController.list);
router.get('/:id', customerController.get);
router.get('/:id/sales', customerController.salesHistory);
router.get('/:id/payments', customerController.paymentsHistory);
router.get('/:id/account', customerController.accountSummary);
router.post('/', customerController.create);
router.put('/:id', customerController.update);

export default router;
