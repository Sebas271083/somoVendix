import { query } from '../config/database.js';

export const CategoryModel = {
  async findAll(tenant_id) {
    return query('SELECT * FROM categories WHERE tenant_id = ? ORDER BY name', [tenant_id]);
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
