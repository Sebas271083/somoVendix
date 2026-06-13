import { Router } from 'express';
import { cashRegisterController } from '../controllers/cashRegisterController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/current', cashRegisterController.getCurrent);
router.post('/open', cashRegisterController.open);
router.post('/movement', cashRegisterController.addMovement);
router.post('/:id/close', cashRegisterController.close);
router.get('/:id/summary', cashRegisterController.getSummary);

export default router;
