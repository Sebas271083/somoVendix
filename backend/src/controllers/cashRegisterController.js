import { CashRegisterModel } from '../models/CashRegisterModel.js';

export const cashRegisterController = {
  async getCurrent(req, res, next) {
    try {
      // Returns the current user's own open register
      const register = await CashRegisterModel.getOpen(req.tenant.id, req.user.id);
      if (!register) return res.json(null);
      const summary = await CashRegisterModel.getSummary(register.id);
      res.json({ ...register, ...summary });
    } catch (err) { next(err); }
  },

  // Admin: see all open registers across all cashiers
  async getAllOpen(req, res, next) {
    try {
      res.json(await CashRegisterModel.getAllOpen(req.tenant.id));
    } catch (err) { next(err); }
  },

  async open(req, res, next) {
    try {
      const existing = await CashRegisterModel.getOpen(req.tenant.id, req.user.id);
      if (existing) return res.status(400).json({ error: 'Ya tenés una caja abierta' });
      const id = await CashRegisterModel.open({
        tenant_id: req.tenant.id,
        user_id: req.user.id,
        opening_amount: parseFloat(req.body.opening_amount) || 0,
        register_name: req.body.register_name || null,
      });
      const register = await CashRegisterModel.findById(id);
      const summary = await CashRegisterModel.getSummary(id);
      res.status(201).json({ ...register, ...summary });
    } catch (err) { next(err); }
  },

  async close(req, res, next) {
    try {
      await CashRegisterModel.close(req.params.id, {
        counted_amount: req.body.counted_amount != null ? parseFloat(req.body.counted_amount) : null,
        notes: req.body.notes || null,
      });
      res.json({ message: 'Caja cerrada' });
    } catch (err) { next(err); }
  },

  async addMovement(req, res, next) {
    try {
      const register = await CashRegisterModel.getOpen(req.tenant.id, req.user.id);
      if (!register) return res.status(400).json({ error: 'No tenés una caja abierta' });
      await CashRegisterModel.addMovement({
        cash_register_id: register.id,
        tenant_id: req.tenant.id,
        user_id: req.user.id,
        user_name_snapshot: req.user.name,
        type: req.body.type,
        amount: parseFloat(req.body.amount),
        description: req.body.description,
      });
      const summary = await CashRegisterModel.getSummary(register.id);
      res.status(201).json(summary);
    } catch (err) { next(err); }
  },

  async getSummary(req, res, next) {
    try {
      const register = await CashRegisterModel.findById(req.params.id);
      if (!register) return res.status(404).json({ error: 'Caja no encontrada' });
      const summary = await CashRegisterModel.getSummary(req.params.id);
      res.json({ ...register, ...summary });
    } catch (err) { next(err); }
  },

  async getHistory(req, res, next) {
    try {
      res.json(await CashRegisterModel.getHistory(req.tenant.id));
    } catch (err) { next(err); }
  },
};
