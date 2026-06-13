import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', settingsController.getAll);
router.put('/', requireAdmin, settingsController.update);

export default router;
