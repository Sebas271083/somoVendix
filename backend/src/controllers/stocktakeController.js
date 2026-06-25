import { StocktakeModel } from '../models/StocktakeModel.js';

export const stocktakeController = {
  async list(req, res, next) {
    try {
      res.json(await StocktakeModel.findAll(req.tenant.id));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const session = await StocktakeModel.findById(req.params.id);
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
      res.json(session);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await StocktakeModel.create({
        ...req.body,
        tenant_id: req.tenant.id,
        created_by: req.user.id,
      });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async updateItem(req, res, next) {
    try {
      await StocktakeModel.updateItem(req.params.itemId, req.body.counted_qty);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async close(req, res, next) {
    try {
      await StocktakeModel.close(req.params.id, req.user.id, req.tenant.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
};
