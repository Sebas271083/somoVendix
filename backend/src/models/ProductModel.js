import { query, getConnection } from '../config/database.js';
import { StockMovementModel } from './StockMovementModel.js';

export const ProductModel = {
  async findAll({ category_id, search, active, tenant_id } = {}) {
    let sql = `
      SELECT p.*, c.name AS category_name, c.color AS category_color,
             s.name AS supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.tenant_id = ?
    `;
    const params = [tenant_id];
    if (active !== undefined) { sql += ' AND p.active = ?'; params.push(active ? 1 : 0); }
    if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
    if (search) { sql += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY p.name';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(code, tenant_id) {
    // Try product code first
    const rows = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.code = ? AND p.tenant_id = ?`,
      [code, tenant_id]
    );
    if (rows[0]) return rows[0];
    // Then try variant sku/barcode — returns a product-shaped object with variant info
    const { ProductVariantModel } = await import('./ProductVariantModel.js');
    const variant = await ProductVariantModel.findByCode(code, tenant_id);
    if (!variant) return null;
    return {
      id: variant.product_id,
      name: `${variant.product_name} — ${variant.label}`,
      code: variant.sku || code,
      price: variant.price ?? variant.base_price,
      cost: variant.cost ?? variant.base_cost,
      stock: variant.stock,
      image_url: variant.image_url,
      category_name: variant.category_name,
      category_color: variant.category_color,
      has_variants: 1,
      _variant_id: variant.id,
      _variant_label: variant.label,
    };
  },

  async create({ code, name, description, price, cost, stock, min_stock, category_id, image_url, unit, supplier_id, has_variants, tenant_id }) {
    const result = await query(
      `INSERT INTO products (tenant_id, code, name, description, price, cost, stock, min_stock, category_id, image_url, unit, supplier_id, has_variants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, code || null, name, description || null, price || 0, cost || 0,
       stock || 0, min_stock || 5, category_id || null, image_url || null,
       unit || 'unidad', supplier_id || null, has_variants ? 1 : 0]
    );
    return result.insertId;
  },

  async update(id, fields, user_id = null, tenant_id = null) {
    const allowed = ['code', 'name', 'description', 'price', 'cost', 'stock', 'min_stock',
                     'category_id', 'image_url', 'active', 'unit', 'supplier_id', 'has_variants'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return;

    // Log price/cost changes
    const priceChanged = keys.includes('price') || keys.includes('cost');
    if (priceChanged && user_id && tenant_id) {
      const [current] = await query('SELECT price, cost FROM products WHERE id = ?', [id]);
      if (current) {
        const newPrice = keys.includes('price') ? parseFloat(fields.price) : null;
        const newCost  = keys.includes('cost')  ? parseFloat(fields.cost)  : null;
        const priceActuallyChanged = newPrice !== null && Math.abs(newPrice - parseFloat(current.price)) > 0.001;
        const costActuallyChanged  = newCost  !== null && Math.abs(newCost  - parseFloat(current.cost))  > 0.001;
        if (priceActuallyChanged || costActuallyChanged) {
          await query(
            `INSERT INTO price_history (product_id, tenant_id, old_price, new_price, old_cost, new_cost, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, tenant_id,
             current.price, newPrice ?? current.price,
             current.cost,  newCost  ?? current.cost,
             user_id]
          );
        }
      }
    }

    const sql = `UPDATE products SET ${keys.map(k => `${k}=?`).join(', ')}, updated_at=NOW() WHERE id=?`;
    await query(sql, [...keys.map(k => fields[k]), id]);
  },

  async adjustStock(id, qty, conn) {
    const execute = conn ? conn.execute.bind(conn) : async (sql, p) => query(sql, p);
    await execute('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, id]);
  },

  async manualAdjust({ product_id, quantity, notes, user_id }) {
    return StockMovementModel.adjust({ product_id, quantity, notes, user_id });
  },

  async getStockHistory(product_id) {
    return StockMovementModel.findByProduct(product_id);
  },

  async getPriceHistory(product_id) {
    return query(
      `SELECT ph.*, u.name AS user_name
       FROM price_history ph
       LEFT JOIN users u ON ph.user_id = u.id
       WHERE ph.product_id = ?
       ORDER BY ph.created_at DESC
       LIMIT 50`,
      [product_id]
    );
  },

  async getLowStock(tenant_id) {
    return query(
      'SELECT * FROM products WHERE tenant_id = ? AND stock <= min_stock AND active = 1 ORDER BY stock ASC',
      [tenant_id]
    );
  },

  async importMany(products, tenant_id) {
    const conn = await getConnection();
    const results = { created: 0, updated: 0, errors: [] };
    try {
      await conn.beginTransaction();
      for (const [idx, row] of products.entries()) {
        try {
          if (!row.name) { results.errors.push({ row: idx + 1, error: 'Nombre requerido' }); continue; }
          // Check if code already exists
          if (row.code) {
            const [[existing]] = await conn.execute(
              'SELECT id FROM products WHERE code = ? AND tenant_id = ?',
              [row.code, tenant_id]
            );
            if (existing) {
              await conn.execute(
                `UPDATE products SET name=?, price=?, cost=?, unit=?, min_stock=?, updated_at=NOW()
                 WHERE id=?`,
                [row.name, row.price || 0, row.cost || 0, row.unit || 'unidad', row.min_stock || 5, existing.id]
              );
              results.updated++;
              continue;
            }
          }
          await conn.execute(
            `INSERT INTO products (tenant_id, code, name, price, cost, stock, min_stock, unit, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [tenant_id, row.code || null, row.name, row.price || 0, row.cost || 0,
             row.stock || 0, row.min_stock || 5, row.unit || 'unidad']
          );
          results.created++;
        } catch (err) {
          results.errors.push({ row: idx + 1, error: err.message });
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return results;
  },
};
