import { PurchaseOrderModel } from '../models/PurchaseOrderModel.js';

export const purchaseOrderController = {
  async list(req, res, next) {
    try {
      res.json(await PurchaseOrderModel.findAll({ ...req.query, tenant_id: req.tenant.id }));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const po = await PurchaseOrderModel.findById(req.params.id);
      if (!po) return res.status(404).json({ error: 'OC no encontrada' });
      res.json(po);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await PurchaseOrderModel.create({ ...req.body, user_id: req.user.id, tenant_id: req.tenant.id });
      res.status(201).json(await PurchaseOrderModel.findById(id));
    } catch (err) { next(err); }
  },

  async receive(req, res, next) {
    try {
      await PurchaseOrderModel.receive(req.params.id, req.user.id);
      res.json({ message: 'OC recibida y stock actualizado' });
    } catch (err) { next(err); }
  },

  async cancel(req, res, next) {
    try {
      await PurchaseOrderModel.cancel(req.params.id);
      res.json({ message: 'OC cancelada' });
    } catch (err) { next(err); }
  },
};
