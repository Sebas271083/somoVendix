import { query, getConnection } from '../config/database.js';
import { StockMovementModel } from './StockMovementModel.js';

export const ProductModel = {
  async findAll({ category_id, search, active, tenant_id } = {}) {
    let sql = `
      SELECT p.*, c.name AS category_name, c.color AS category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = ?
    `;
    const params = [tenant_id];

    if (active !== undefined) {
      sql += ' AND p.active = ?';
      params.push(active ? 1 : 0);
    }
    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY p.name';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(code, tenant_id) {
    const rows = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.code = ? AND p.tenant_id = ?`,
      [code, tenant_id]
    );
    return rows[0] || null;
  },

  async create({ code, name, description, price, cost, stock, min_stock, category_id, image_url, tenant_id }) {
    const result = await query(
      `INSERT INTO products (tenant_id, code, name, description, price, cost, stock, min_stock, category_id, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, code, name, description, price, cost, stock, min_stock, category_id, image_url]
    );
    return result.insertId;
  },

  async update(id, fields) {
    const allowed = ['code', 'name', 'description', 'price', 'cost', 'stock', 'min_stock', 'category_id', 'image_url', 'active'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return;
    const sql = `UPDATE products SET ${keys.map(k => `${k}=?`).join(', ')} WHERE id=?`;
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

  async getLowStock(tenant_id) {
    return query(
      'SELECT * FROM products WHERE tenant_id = ? AND stock <= min_stock AND active = 1 ORDER BY stock ASC',
      [tenant_id]
    );
  },
};
