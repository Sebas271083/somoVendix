import { SaleModel } from '../models/SaleModel.js';
import { emailService } from '../services/emailService.js';
import { query } from '../config/database.js';
import { afipService } from '../services/afipService.js';

export const saleController = {
  async list(req, res, next) {
    try {
      const sales = await SaleModel.findAll({ ...req.query, tenant_id: req.tenant.id });
      // When searching by ticket number, hydrate items on each result
      if (req.query.ticket_number && sales.length) {
        const hydrated = await Promise.all(sales.map((s) => SaleModel.findById(s.id)));
        return res.json(hydrated.filter(Boolean));
      }
      res.json(sales);
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const sale = await SaleModel.findById(req.params.id);
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
      res.json(sale);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const saleData = {
        ...req.body,
        user_id: req.user.id,
        tenant_id: req.tenant.id,
      };
      const sale_id = await SaleModel.create(saleData);
      const sale = await SaleModel.findById(sale_id);

      // Request CAE from AFIP (silent fail — sale is always valid without it)
      let afip = null;
      try {
        afip = await afipService.requestCAE(req.tenant.id, sale);
      } catch (afipErr) {
        console.error('[AFIP] CAE request failed:', afipErr.message);
      }

      res.status(201).json({ ...sale, afip });

      // Send receipt email (fire-and-forget)
      if (sale?.customer_email) {
        emailService.sendSaleReceipt(sale.customer_email, sale, req.tenant.name).catch(() => {});
      }
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      await SaleModel.cancel(req.params.id, req.user.id);
      res.json({ message: 'Venta cancelada y stock restituido' });
    } catch (err) { next(err); }
  },

  async dailySummary(req, res, next) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      res.json(await SaleModel.getDailySummary(date, req.tenant.id));
    } catch (err) { next(err); }
  },
};
