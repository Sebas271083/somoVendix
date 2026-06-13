import { Router } from 'express';
import { cashFlowController } from '../controllers/cashFlowController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', cashFlowController.list);
router.get('/daily', cashFlowController.dailySummary);
router.get('/period', cashFlowController.periodSummary);
router.get('/categories', cashFlowController.categoryBreakdown);
router.post('/', cashFlowController.create);
router.delete('/:id', cashFlowController.delete);

export default router;
