import { CashRegisterModel } from '../models/CashRegisterModel.js';

export const cashRegisterController = {
  async getCurrent(req, res, next) {
    try {
      const register = await CashRegisterModel.getOpen(req.tenant.id);
      res.json(register || null);
    } catch (err) { next(err); }
  },

  async open(req, res, next) {
    try {
      const existing = await CashRegisterModel.getOpen(req.tenant.id);
      if (existing) return res.status(400).json({ error: 'Ya hay una caja abierta' });
      const id = await CashRegisterModel.open({
        tenant_id: req.tenant.id,
        user_id: req.user.id,
        opening_amount: req.body.opening_amount,
      });
      const register = await CashRegisterModel.findById(id);
      res.status(201).json(register);
    } catch (err) { next(err); }
  },

  async close(req, res, next) {
    try {
      await CashRegisterModel.close(req.params.id, req.body);
      res.json({ message: 'Caja cerrada' });
    } catch (err) { next(err); }
  },

  async addMovement(req, res, next) {
    try {
      const register = await CashRegisterModel.getOpen(req.tenant.id);
      if (!register) return res.status(400).json({ error: 'No hay caja abierta' });
      const id = await CashRegisterModel.addMovement({
        cash_register_id: register.id,
        tenant_id: req.tenant.id,
        ...req.body,
      });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async getSummary(req, res, next) {
    try {
      const summary = await CashRegisterModel.getSummary(req.params.id);
      res.json(summary);
    } catch (err) { next(err); }
  },
};
