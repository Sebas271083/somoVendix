import { ReturnModel } from '../models/ReturnModel.js';

export const returnController = {
  async list(req, res, next) {
    try {
      res.json(await ReturnModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const return_id = await ReturnModel.create({
        ...req.body,
        user_id: req.user.id,
        tenant_id: req.tenant.id,
      });
      res.status(201).json({ id: return_id });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  },

  async bySale(req, res, next) {
    try {
      res.json(await ReturnModel.findBySale(req.params.sale_id));
    } catch (err) { next(err); }
  },
};
