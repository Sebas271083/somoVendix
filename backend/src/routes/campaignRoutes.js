import { Router } from 'express';
import { campaignController } from '../controllers/campaignController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', campaignController.list);
router.get('/:id', campaignController.get);
router.get('/:id/whatsapp-links', campaignController.whatsappLinks);
router.post('/', campaignController.create);
router.post('/:id/send', campaignController.send);
router.put('/:id', campaignController.update);
router.delete('/:id', campaignController.delete);

export default router;
