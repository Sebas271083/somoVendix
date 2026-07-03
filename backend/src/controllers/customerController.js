import { CustomerModel } from '../models/CustomerModel.js';
import { CustomerInteractionModel } from '../models/CustomerInteractionModel.js';
import { LoyaltyModel } from '../models/LoyaltyModel.js';

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
      res.status(201).json(await CustomerModel.findById(id));
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await CustomerModel.update(req.params.id, req.body);
      res.json(await CustomerModel.findById(req.params.id));
    } catch (err) { next(err); }
  },

  async deactivate(req, res, next) {
    try {
      await CustomerModel.deactivate(req.params.id);
      res.json({ ok: true });
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

  async metrics(req, res, next) {
    try {
      res.json(await CustomerModel.getMetrics(req.params.id));
    } catch (err) { next(err); }
  },

  // CRM interactions
  async listInteractions(req, res, next) {
    try {
      res.json(await CustomerInteractionModel.findByCustomer(req.params.id));
    } catch (err) { next(err); }
  },

  async createInteraction(req, res, next) {
    try {
      const id = await CustomerInteractionModel.create({
        ...req.body,
        customer_id: req.params.id,
        tenant_id: req.tenant.id,
        user_id: req.user.id,
      });
      res.status(201).json({ id });
    } catch (err) { next(err); }
  },

  async deleteInteraction(req, res, next) {
    try {
      await CustomerInteractionModel.delete(req.params.intId);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  // Loyalty
  async loyaltyHistory(req, res, next) {
    try {
      res.json(await LoyaltyModel.getHistory(req.params.id));
    } catch (err) { next(err); }
  },

  async loyaltyAdjust(req, res, next) {
    try {
      const newBalance = await LoyaltyModel.manualAdjust({
        tenant_id: req.tenant.id,
        customer_id: req.params.id,
        points: req.body.points,
        notes: req.body.notes,
        user_id: req.user.id,
      });
      res.json({ balance: newBalance });
    } catch (err) { next(err); }
  },

  async loyaltyPreview(req, res, next) {
    try {
      res.json(await LoyaltyModel.previewRedemption(req.tenant.id, req.params.id, req.body.points));
    } catch (err) { next(err); }
  },

  // Price lists
  async getPriceLists(req, res, next) {
    try {
      res.json(await CustomerModel.getPriceLists(req.tenant.id));
    } catch (err) { next(err); }
  },

  async updatePriceList(req, res, next) {
    try {
      await CustomerModel.updatePriceList(req.tenant.id, req.params.segment, req.body.discount_pct);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  // CSV import
  async importCSV(req, res, next) {
    try {
      const results = await CustomerModel.importMany(req.body.customers, req.tenant.id);
      res.json(results);
    } catch (err) { next(err); }
  },
};
