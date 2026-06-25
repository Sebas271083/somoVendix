import { Router } from 'express';
import { billingController } from '../controllers/billingController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/plans', billingController.getPlans);
router.post('/checkout', billingController.createCheckout);
router.get('/status', billingController.getStatus);

export default router;
