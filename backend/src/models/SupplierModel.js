import { query } from '../config/database.js';

export const SupplierModel = {
  async findAll(search, tenant_id) {
    let sql = 'SELECT * FROM suppliers WHERE tenant_id = ?';
    const params = [tenant_id];
    if (search) {
      sql += ' AND (name LIKE ? OR contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, contact, phone, email, address, notes, tenant_id }) {
    const result = await query(
      'INSERT INTO suppliers (tenant_id, name, contact, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenant_id, name, contact, phone, email, address, notes]
    );
    return result.insertId;
  },

  async update(id, { name, contact, phone, email, address, notes }) {
    await query(
      'UPDATE suppliers SET name=?, contact=?, phone=?, email=?, address=?, notes=? WHERE id=?',
      [name, contact, phone, email, address, notes, id]
    );
  },

  async delete(id) {
    await query('DELETE FROM suppliers WHERE id = ?', [id]);
  },
};
