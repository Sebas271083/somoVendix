import { SaleModel } from '../models/SaleModel.js';

export const saleController = {
  async list(req, res, next) {
    try {
      res.json(await SaleModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
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
      res.status(201).json(sale);
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
