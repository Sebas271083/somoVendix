import { InstallmentModel } from '../models/InstallmentModel.js';

export const installmentController = {
  async list(req, res, next) {
    try {
      res.json(await InstallmentModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async getInstallments(req, res, next) {
    try {
      res.json(await InstallmentModel.getInstallments(req.params.plan_id));
    } catch (err) { next(err); }
  },

  async markPaid(req, res, next) {
    try {
      await InstallmentModel.markPaid(req.params.id, req.user.id, req.body.notes);
      res.json({ message: 'Cuota registrada como pagada' });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  },
};
