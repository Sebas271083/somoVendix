import { ExpenseModel } from '../models/ExpenseModel.js';

export const expenseController = {
  async list(req, res, next) {
    try {
      const tenant_id = req.tenant.id;
      await ExpenseModel.updateOverdue(tenant_id);
      res.json(await ExpenseModel.findAll({ ...req.query, tenant_id }));
    } catch (err) { next(err); }
  },

  async summary(req, res, next) {
    try {
      res.json(await ExpenseModel.getSummary(req.tenant.id));
    } catch (err) { next(err); }
  },

  async categories(req, res, next) {
    try {
      res.json(await ExpenseModel.getCategories(req.tenant.id));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const expense = await ExpenseModel.findById(req.params.id);
      if (!expense) return res.status(404).json({ error: 'Gasto no encontrado' });
      res.json(expense);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const { description, amount } = req.body;
      if (!description || !amount) return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
      const id = await ExpenseModel.create({ ...req.body, user_id: req.user.id, tenant_id: req.tenant.id });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await ExpenseModel.update(req.params.id, req.body);
      res.json({ message: 'Gasto actualizado' });
    } catch (err) { next(err); }
  },

  async markPaid(req, res, next) {
    try {
      await ExpenseModel.markPaid(req.params.id, req.user.id, req.tenant.id);
      res.json({ message: 'Gasto marcado como pagado' });
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await ExpenseModel.delete(req.params.id);
      res.json({ message: 'Gasto eliminado' });
    } catch (err) { next(err); }
  },
};
