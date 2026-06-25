import { Router } from 'express';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { afipController } from '../controllers/afipController.js';

const router = Router();

router.get('/settings', requireAdmin, afipController.getSettings);
router.put('/settings', requireAdmin, afipController.saveSettings);
router.post('/test', requireAdmin, afipController.testConnection);
router.get('/sale/:id/qr', afipController.getSaleQR);

export default router;
