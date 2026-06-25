import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { errorHandler } from './middleware/errorHandler.js';
import { tenantMiddleware } from './middleware/tenantMiddleware.js';
import { requireFeature } from './middleware/planLimitsMiddleware.js';
import { TenantModel } from './models/TenantModel.js';
import { billingController } from './controllers/billingController.js';

import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import cashRegisterRoutes from './routes/cashRegisterRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import cashFlowRoutes from './routes/cashFlowRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import stocktakeRoutes from './routes/stocktakeRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import installmentRoutes from './routes/installmentRoutes.js';
import afipRoutes from './routes/afipRoutes.js';
import { emailService } from './services/emailService.js';
import { initDb } from '../initDb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5200',
    ];
    if (!origin || allowed.includes(origin) || /\.gestix\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Public routes (no tenant required)
app.use('/api/public', publicRoutes);

// Super-admin routes (no tenant, own auth)
app.use('/api/admin', adminRoutes);


app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Webhook de MercadoPago: sin tenant (MP no envía X-Tenant)
app.post('/api/billing/webhook', billingController.webhook);

// All tenant routes require tenant resolution first
app.use(tenantMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/suppliers', requireFeature('suppliers'), supplierRoutes);
app.use('/api/payments', requireFeature('receivables'), paymentRoutes);
app.use('/api/expenses', requireFeature('expenses'), expenseRoutes);
app.use('/api/cash-flow', requireFeature('cashflow'), cashFlowRoutes);
app.use('/api/reports', requireFeature('reports'), reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/purchase-orders', requireFeature('suppliers'), purchaseOrderRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/stocktake', stocktakeRoutes);
app.use('/api/campaigns', requireFeature('crm'), campaignRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/afip', afipRoutes);

app.use(errorHandler);

// Inicializar/migrar BD antes de aceptar tráfico
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);

      const ONE_HOUR = 60 * 60 * 1000;

      // Verificar trials vencidos cada hora
      setInterval(async () => {
        try {
          await TenantModel.checkTrials();
        } catch (err) {
          console.error('[trial-check]', err.message);
        }
      }, ONE_HOUR);

      // Alertas de stock bajo cada 4 horas
      const FOUR_HOURS = 4 * ONE_HOUR;
      setInterval(async () => {
        try {
          await emailService.checkAndSendAlerts();
        } catch (err) {
          console.error('[stock-alert]', err.message);
        }
      }, FOUR_HOURS);
    });
  })
  .catch(err => {
    console.error('❌ No se pudo inicializar la BD, servidor no arrancó:', err.message);
    process.exit(1);
  });

export default app;
