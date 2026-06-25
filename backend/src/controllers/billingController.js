import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { query } from '../config/database.js';
import crypto from 'crypto';

const getClient = () => new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3008';

export const billingController = {
  // GET /api/billing/plans — lista planes con precio (requiere auth)
  async getPlans(req, res, next) {
    try {
      const rows = await query(
        'SELECT id, name, slug, price, max_products, max_users, max_sales_per_month, features FROM plans WHERE is_active = 1 ORDER BY id'
      );
      const plans = rows.map(p => ({
        ...p,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
      }));
      res.json(plans);
    } catch (err) { next(err); }
  },

  // POST /api/billing/checkout — crea preferencia MP y devuelve init_point
  async createCheckout(req, res, next) {
    try {
      const { plan_id } = req.body;
      if (!plan_id) return res.status(400).json({ error: 'plan_id requerido' });

      const [plan] = await query('SELECT * FROM plans WHERE id = ? AND is_active = 1', [plan_id]);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

      if (plan.price <= 0) {
        return res.status(400).json({ error: 'Este plan no requiere pago' });
      }

      const tenant = req.tenant;
      const client = getClient();
      const preferenceClient = new Preference(client);

      const externalRef = `${tenant.id}|${plan_id}`;

      const preference = await preferenceClient.create({
        body: {
          items: [{
            id: String(plan.id),
            title: `Gestix ${plan.name} - Mensual`,
            description: `Suscripción mensual al plan ${plan.name} de Gestix`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: Number(plan.price),
          }],
          back_urls: {
            success: `${APP_URL}/billing/success`,
            failure: `${APP_URL}/billing/failure`,
            pending: `${APP_URL}/billing/pending`,
          },
          auto_return: 'approved',
          notification_url: `${BACKEND_URL}/api/billing/webhook`,
          external_reference: externalRef,
          statement_descriptor: 'GESTIX',
          metadata: { tenant_id: tenant.id, plan_id },
        },
      });

      const init_point = process.env.MP_SANDBOX === 'true'
        ? preference.sandbox_init_point
        : preference.init_point;

      res.json({ init_point, preference_id: preference.id });
    } catch (err) { next(err); }
  },

  // POST /api/billing/webhook — MP notifica pago (ruta pública, sin tenant)
  async webhook(req, res) {
    try {
      // Validar firma MP (si está configurado el secret)
      if (process.env.MP_WEBHOOK_SECRET) {
        const xSignature = req.headers['x-signature'] || '';
        const xRequestId = req.headers['x-request-id'] || '';
        const { 'data.id': dataId } = req.query;

        const parts = xSignature.split(',').reduce((acc, part) => {
          const [k, v] = part.trim().split('=');
          acc[k] = v;
          return acc;
        }, {});

        const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
        const expected = crypto
          .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
          .update(manifest)
          .digest('hex');

        if (expected !== parts.v1) {
          return res.status(401).json({ error: 'Firma inválida' });
        }
      }

      const { type, data } = req.body;

      // Solo procesamos eventos de pago aprobado
      if (type !== 'payment') {
        return res.sendStatus(200);
      }

      const client = getClient();
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: data.id });

      if (payment.status !== 'approved') {
        return res.sendStatus(200);
      }

      // external_reference = "tenant_id|plan_id"
      const [tenantIdStr, planIdStr] = (payment.external_reference || '').split('|');
      const tenantId = parseInt(tenantIdStr);
      const planId = parseInt(planIdStr);

      if (!tenantId || !planId) return res.sendStatus(200);

      // Calcular fin del período (30 días desde hoy)
      const periodEnd = new Date(Date.now() + 30 * 86400000);

      // Actualizar suscripción
      await query(
        `UPDATE subscriptions
         SET status = 'active', plan_id = ?, current_period_end = ?, external_id = ?
         WHERE tenant_id = ?`,
        [planId, periodEnd, String(payment.id), tenantId]
      );

      // Actualizar tenant
      await query(
        `UPDATE tenants SET plan_id = ?, status = 'active', trial_ends_at = NULL WHERE id = ?`,
        [planId, tenantId]
      );

      res.sendStatus(200);
    } catch (err) {
      console.error('[billing webhook]', err.message);
      res.sendStatus(500);
    }
  },

  // GET /api/billing/status — estado de suscripción actual
  async getStatus(req, res, next) {
    try {
      const rows = await query(
        `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.price
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.tenant_id = ?
         ORDER BY s.id DESC LIMIT 1`,
        [req.tenant.id]
      );
      res.json(rows[0] || null);
    } catch (err) { next(err); }
  },
};
