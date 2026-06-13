import { CustomerModel } from '../models/CustomerModel.js';

export const customerController = {
  async list(req, res, next) {
    try {
      res.json(await CustomerModel.findAll(req.query.search, req.tenant.id));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const customer = await CustomerModel.findById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json(customer);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await CustomerModel.create({ ...req.body, tenant_id: req.tenant.id });
      const customer = await CustomerModel.findById(id);
      res.status(201).json(customer);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await CustomerModel.update(req.params.id, req.body);
      const customer = await CustomerModel.findById(req.params.id);
      res.json(customer);
    } catch (err) { next(err); }
  },

  async salesHistory(req, res, next) {
    try {
      res.json(await CustomerModel.getSalesHistory(req.params.id));
    } catch (err) { next(err); }
  },

  async paymentsHistory(req, res, next) {
    try {
      res.json(await CustomerModel.getPaymentsHistory(req.params.id));
    } catch (err) { next(err); }
  },

  async accountSummary(req, res, next) {
    try {
      res.json(await CustomerModel.getAccountSummary(req.params.id));
    } catch (err) { next(err); }
  },
};
