import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { productController } from '../controllers/productController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { checkProductLimit } from '../middleware/planLimitsMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../public/uploads/products');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

router.get('/', productController.list);
router.get('/low-stock', productController.lowStock);
router.get('/code/:code', productController.getByCode);
router.get('/:id', productController.get);
router.get('/:id/stock-history', productController.stockHistory);
router.get('/:id/price-history', productController.priceHistory);
router.get('/:id/variants', productController.getVariants);
router.post('/:id/variants', requireAdmin, productController.saveVariants);
router.patch('/:id/variants/:variantId/stock', requireAdmin, productController.adjustVariantStock);

router.post('/', requireAdmin, checkProductLimit, productController.create);
router.post('/import', requireAdmin, productController.importCSV);
router.post('/:id/image', requireAdmin, upload.single('image'), productController.uploadImage);

router.put('/:id', requireAdmin, productController.update);
router.patch('/:id/stock', requireAdmin, productController.adjustStock);

export default router;
