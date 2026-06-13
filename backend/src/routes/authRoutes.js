import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);

export default router;
