import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/', expenseController.list);
router.get('/summary', expenseController.summary);
router.get('/categories', expenseController.categories);
router.get('/:id', expenseController.get);
router.post('/', expenseController.create);
router.put('/:id', expenseController.update);
router.patch('/:id/pay', expenseController.markPaid);
router.delete('/:id', expenseController.delete);

export default router;
