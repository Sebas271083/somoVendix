import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', customerController.list);
router.get('/price-lists', customerController.getPriceLists);
router.get('/:id', customerController.get);
router.get('/:id/sales', customerController.salesHistory);
router.get('/:id/payments', customerController.paymentsHistory);
router.get('/:id/account', customerController.accountSummary);
router.get('/:id/metrics', customerController.metrics);
router.get('/:id/interactions', customerController.listInteractions);
router.get('/:id/loyalty', customerController.loyaltyHistory);

router.post('/', customerController.create);
router.post('/import', requireAdmin, customerController.importCSV);
router.post('/:id/interactions', customerController.createInteraction);
router.post('/:id/loyalty/preview', customerController.loyaltyPreview);

router.put('/:id', customerController.update);
router.patch('/price-lists/:segment', requireAdmin, customerController.updatePriceList);
router.patch('/:id/deactivate', requireAdmin, customerController.deactivate);
router.patch('/:id/loyalty/adjust', requireAdmin, customerController.loyaltyAdjust);

router.delete('/:id/interactions/:intId', requireAdmin, customerController.deleteInteraction);

export default router;
