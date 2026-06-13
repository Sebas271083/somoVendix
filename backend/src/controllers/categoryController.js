import { CategoryModel } from '../models/CategoryModel.js';

export const categoryController = {
  async list(req, res, next) {
    try {
      res.json(await CategoryModel.findAll(req.tenant.id));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await CategoryModel.create({ ...req.body, tenant_id: req.tenant.id });
      const category = await CategoryModel.findById(id);
      res.status(201).json(category);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await CategoryModel.update(req.params.id, req.body);
      res.json({ message: 'Categoría actualizada' });
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await CategoryModel.delete(req.params.id);
      res.json({ message: 'Categoría eliminada' });
    } catch (err) { next(err); }
  },
};
