import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/receivables', paymentController.receivables);
router.get('/', paymentController.list);
router.get('/customer/:customer_id', paymentController.listByCustomer);
router.post('/', paymentController.create);

export default router;
