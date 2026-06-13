import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { checkUserLimit } from '../middleware/planLimitsMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/', userController.list);
router.post('/', checkUserLimit, userController.create);
router.put('/:id', userController.update);
router.put('/:id/reset-password', userController.resetPassword);

export default router;
