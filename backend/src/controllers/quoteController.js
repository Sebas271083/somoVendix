import { QuoteModel } from '../models/QuoteModel.js';

export const quoteController = {
  async list(req, res, next) {
    try {
      res.json(await QuoteModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const quote = await QuoteModel.findById(req.params.id);
      if (!quote) return res.status(404).json({ error: 'Presupuesto no encontrado' });
      res.json(quote);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await QuoteModel.create({ ...req.body, user_id: req.user.id, tenant_id: req.tenant.id });
      res.status(201).json(await QuoteModel.findById(id));
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await QuoteModel.update(req.params.id, req.body);
      res.json(await QuoteModel.findById(req.params.id));
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await QuoteModel.delete(req.params.id);
      res.json({ message: 'Presupuesto eliminado' });
    } catch (err) { next(err); }
  },
};
