import { CashFlowModel } from '../models/CashFlowModel.js';

export const cashFlowController = {
  async list(req, res, next) {
    try {
      res.json(await CashFlowModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { type, amount, description } = req.body;
      if (!type || !amount || !description) {
        return res.status(400).json({ error: 'Tipo, monto y descripción son obligatorios' });
      }
      const id = await CashFlowModel.create({ ...req.body, user_id: req.user.id, tenant_id: req.tenant.id });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await CashFlowModel.delete(req.params.id);
      res.json({ message: 'Movimiento eliminado' });
    } catch (err) { next(err); }
  },

  async dailySummary(req, res, next) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      res.json(await CashFlowModel.getDailySummary(date, req.tenant.id));
    } catch (err) { next(err); }
  },

  async periodSummary(req, res, next) {
    try {
      const { from, to } = req.query;
      const end = to || new Date().toISOString().split('T')[0];
      const start = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      res.json(await CashFlowModel.getPeriodSummary(start, end, req.tenant.id));
    } catch (err) { next(err); }
  },

  async categoryBreakdown(req, res, next) {
    try {
      const { from, to, type } = req.query;
      const end = to || new Date().toISOString().split('T')[0];
      const start = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      res.json(await CashFlowModel.getCategoryBreakdown(start, end, type, req.tenant.id));
    } catch (err) { next(err); }
  },
};
