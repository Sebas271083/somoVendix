import { query } from '../config/database.js';

export const CategoryModel = {
  async findAll(tenant_id) {
    return query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
       WHERE c.tenant_id = ?
       GROUP BY c.id
       ORDER BY c.name`,
      [tenant_id]
    );
  },

  async findById(id) {
    const rows = await query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, slug, color, tenant_id }) {
    const result = await query(
      'INSERT INTO categories (tenant_id, name, slug, color) VALUES (?, ?, ?, ?)',
      [tenant_id, name, slug, color]
    );
    return result.insertId;
  },

  async update(id, { name, slug, color }) {
    await query('UPDATE categories SET name=?, slug=?, color=? WHERE id=?', [name, slug, color, id]);
  },

  async delete(id) {
    await query('DELETE FROM categories WHERE id=?', [id]);
  },
};
