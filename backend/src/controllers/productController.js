import { ProductModel } from '../models/ProductModel.js';

export const productController = {
  async list(req, res, next) {
    try {
      const { category_id, search, active } = req.query;
      const products = await ProductModel.findAll({
        category_id,
        search,
        active: active !== undefined ? active === 'true' : true,
        tenant_id: req.tenant.id,
      });
      res.json(products);
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(product);
    } catch (err) { next(err); }
  },

  async getByCode(req, res, next) {
    try {
      const product = await ProductModel.findByCode(req.params.code, req.tenant.id);
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(product);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const id = await ProductModel.create({ ...req.body, tenant_id: req.tenant.id });
      const product = await ProductModel.findById(id);
      res.status(201).json(product);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      await ProductModel.update(req.params.id, req.body);
      const product = await ProductModel.findById(req.params.id);
      res.json(product);
    } catch (err) { next(err); }
  },

  async adjustStock(req, res, next) {
    try {
      const { quantity, reason } = req.body;
      const newStock = await ProductModel.manualAdjust({
        product_id: parseInt(req.params.id),
        quantity: parseInt(quantity),
        notes: reason || null,
        user_id: req.user.id,
      });
      res.json({ message: 'Stock ajustado', new_stock: newStock });
    } catch (err) { next(err); }
  },

  async stockHistory(req, res, next) {
    try {
      res.json(await ProductModel.getStockHistory(req.params.id));
    } catch (err) { next(err); }
  },

  async lowStock(req, res, next) {
    try {
      res.json(await ProductModel.getLowStock(req.tenant.id));
    } catch (err) { next(err); }
  },
};
