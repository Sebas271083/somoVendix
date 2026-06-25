import { LocationModel } from '../models/LocationModel.js';

export const locationController = {
  async list(req, res, next) {
    try {
      const rows = await LocationModel.findAll(req.tenant.id);
      res.json(rows);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await LocationModel.create({ ...req.body, tenant_id: req.tenant.id });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await LocationModel.update(req.params.id, req.body, req.tenant.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async getStock(req, res, next) {
    try {
      const stock = await LocationModel.getStock(req.params.id);
      res.json(stock);
    } catch (err) { next(err); }
  },

  async transfer(req, res, next) {
    try {
      const { to_location_id, product_id, variant_id, quantity } = req.body;
      await LocationModel.transfer({
        from_location_id: req.params.id,
        to_location_id,
        product_id,
        variant_id: variant_id || 0,
        quantity,
        user_id: req.user.id,
        tenant_id: req.tenant.id,
      });
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
};
