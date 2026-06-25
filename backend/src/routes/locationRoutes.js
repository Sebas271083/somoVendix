import { Router } from 'express';
import { locationController } from '../controllers/locationController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', locationController.list);
router.get('/:id/stock', locationController.getStock);
router.post('/:id/transfer', locationController.transfer);

router.use(requireAdmin);
router.post('/', locationController.create);
router.put('/:id', locationController.update);

export default router;
