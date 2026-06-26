import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { adminController } from '../controllers/adminController.js';

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

const authenticateAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de super-admin requerido' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], ADMIN_SECRET);
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Auth
router.post('/login', adminController.login);

// Protected
router.use(authenticateAdmin);
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.createTenant);
router.get('/tenants/:id', adminController.getTenant);
router.put('/tenants/:id', adminController.updateTenant);
router.put('/tenants/:id/features', adminController.updateFeatures);
router.post('/tenants/:id/extend-trial', adminController.extendTrial);
router.get('/stats', adminController.getStats);
router.get('/plans', adminController.getPlans);
router.post('/check-trials', adminController.checkTrials);

export default router;
