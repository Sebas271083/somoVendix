import { query } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const AdminModel = {
  async findByEmail(email) {
    const rows = await query('SELECT * FROM admins WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query('SELECT id, name, email, created_at FROM admins WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, email, password }) {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      [name, email, hash]
    );
    return result.insertId;
  },
};
