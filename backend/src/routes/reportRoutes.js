import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', reportController.dashboard);
router.get('/sales/period', reportController.salesByPeriod);
router.get('/sales/payment-method', reportController.salesByPaymentMethod);
router.get('/sales/seller', reportController.salesBySeller);
router.get('/sales/category', reportController.salesByCategory);
router.get('/products/top', reportController.topProducts);
router.get('/customers/top', reportController.topCustomers);
router.get('/inventory/value', reportController.inventoryValue);
router.get('/returns/summary', reportController.returnsSummary);
router.get('/income-statement', reportController.incomeStatement);
router.get('/comparison', reportController.comparison);
router.get('/projection', reportController.projection);

export default router;
