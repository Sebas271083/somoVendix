import { ProductModel } from '../models/ProductModel.js';
import { ProductVariantModel } from '../models/ProductVariantModel.js';

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
      await ProductModel.update(req.params.id, req.body, req.user.id, req.tenant.id);
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

  async priceHistory(req, res, next) {
    try {
      res.json(await ProductModel.getPriceHistory(req.params.id));
    } catch (err) { next(err); }
  },

  async importCSV(req, res, next) {
    try {
      const { products } = req.body;
      if (!Array.isArray(products) || !products.length) {
        return res.status(400).json({ error: 'Se requiere un array de productos' });
      }
      const results = await ProductModel.importMany(products, req.tenant.id);
      res.json(results);
    } catch (err) { next(err); }
  },

  async uploadImage(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
      const url = `/uploads/products/${req.file.filename}`;
      await ProductModel.update(req.params.id, { image_url: url });
      res.json({ url });
    } catch (err) { next(err); }
  },

  async getVariants(req, res, next) {
    try {
      const [variants, attributes] = await Promise.all([
        ProductVariantModel.getByProduct(req.params.id),
        ProductVariantModel.getAttributes(req.params.id),
      ]);
      res.json({ variants, attributes });
    } catch (err) { next(err); }
  },

  async adjustVariantStock(req, res, next) {
    try {
      const { quantity, reason } = req.body;
      const newStock = await ProductVariantModel.manualAdjust({
        variant_id: parseInt(req.params.variantId),
        product_id: parseInt(req.params.id),
        quantity: parseInt(quantity),
        notes: reason || null,
        user_id: req.user.id,
      });
      res.json({ message: 'Stock ajustado', new_stock: newStock });
    } catch (err) { next(err); }
  },

  async saveVariants(req, res, next) {
    try {
      const { attributes, variants } = req.body;
      if (attributes) {
        await ProductVariantModel.setAttributes(req.params.id, attributes, req.tenant.id);
      }
      if (variants) {
        // Re-fetch attribute values after saving attributes to get fresh IDs
        const freshAttrs = await ProductVariantModel.getAttributes(req.params.id);
        // Map value strings back to IDs for new variants
        const valueMap = {};
        for (const attr of freshAttrs) {
          for (const v of attr.values) valueMap[`${attr.name}::${v.value}`] = v.id;
        }
        const variantsWithIds = variants.map(v => ({
          ...v,
          attribute_value_ids: v.attribute_values
            ? v.attribute_values.map(av => valueMap[`${av.attr_name}::${av.value}`]).filter(Boolean)
            : v.attribute_value_ids,
        }));
        await ProductVariantModel.upsertVariants(req.params.id, variantsWithIds, req.tenant.id);
      }
      const result = await ProductVariantModel.getByProduct(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },
};
