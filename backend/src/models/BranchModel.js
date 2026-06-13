import { query } from '../config/database.js';

export const BranchModel = {
  async findAll() {
    return query('SELECT * FROM branches ORDER BY name');
  },

  async findById(id) {
    const rows = await query('SELECT * FROM branches WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, address, phone }) {
    const result = await query(
      'INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)',
      [name, address, phone]
    );
    return result.insertId;
  },

  async update(id, { name, address, phone }) {
    await query('UPDATE branches SET name=?, address=?, phone=? WHERE id=?', [name, address, phone, id]);
  },
};
