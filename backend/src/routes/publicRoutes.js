import { Router } from 'express';
import { publicController } from '../controllers/publicController.js';

const router = Router();

router.get('/plans', publicController.getPlans);
router.post('/register', publicController.register);
router.get('/check-subdomain/:subdomain', publicController.checkSubdomain);

export default router;
