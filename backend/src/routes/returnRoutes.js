import { Router } from 'express';
import { returnController } from '../controllers/returnController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);
router.get('/', returnController.list);
router.post('/', returnController.create);
router.get('/sale/:sale_id', returnController.bySale);

export default router;
