import { SupplierModel } from '../models/SupplierModel.js';

export const supplierController = {
  async list(req, res, next) {
    try {
      res.json(await SupplierModel.findAll(req.query.search, req.tenant.id));
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const supplier = await SupplierModel.findById(req.params.id);
      if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });
      res.json(supplier);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await SupplierModel.create({ ...req.body, tenant_id: req.tenant.id });
      const supplier = await SupplierModel.findById(id);
      res.status(201).json(supplier);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await SupplierModel.update(req.params.id, req.body);
      const supplier = await SupplierModel.findById(req.params.id);
      res.json(supplier);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      await SupplierModel.delete(req.params.id);
      res.json({ message: 'Proveedor eliminado' });
    } catch (err) { next(err); }
  },
};
